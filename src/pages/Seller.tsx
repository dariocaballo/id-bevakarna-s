import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, DollarSign, CheckCircle, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImageCache } from '@/hooks/useImageCache';
import { useAudioManager } from '@/hooks/useAudioManager';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  monthly_goal: number;
}

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount: number;
  tb_amount: number;
  units: number;
  service_type: string;
  timestamp: string;
  is_id_skydd?: boolean;
  created_at: string;
}

const Seller = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [tbAmount, setTbAmount] = useState('');
  const [idUnits, setIdUnits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todaysSales, setTodaysSales] = useState<Sale[]>([]);
  const [celebrationSale, setCelebrationSale] = useState<Sale | null>(null);
  const [celebrationAudioDuration, setCelebrationAudioDuration] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  
  // Audio and image optimization hooks
  const { preloadImages, getCachedImage } = useImageCache();
  const { initializeAudio, preloadSellerSounds, playSellerSound, ensureAudioContextReady } = useAudioManager();

  // Load all sellers (public access)
  const loadSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSellers(data || []);
      
      // Preload images and sounds
      if (data) {
        const imageUrls = data.filter(s => s.profile_image_url).map(s => s.profile_image_url!);
        
        preloadImages(imageUrls);
        preloadSellerSounds(data.filter(s => s.sound_file_url));
      }
    } catch (error) {
      console.error('❌ Error loading sellers:', error);
    }
  };

  // Load today's sales (public access)
  const loadTodaysSales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodaysSales(data || []);
    } catch (error) {
      console.error('❌ Error loading today\'s sales:', error);
    }
  };

  // Handle celebration with audio sync
  const handleNewSale = async (sale: Sale, seller?: Seller) => {
    console.log('🎆 Celebration triggered for sale:', sale);
    
    try {
      await ensureAudioContextReady();
      
      setCelebrationSale(sale);
      
      if (seller?.sound_file_url) {
        const audioResult = await playSellerSound(seller.sound_file_url);
        const duration = audioResult?.duration;
        setCelebrationAudioDuration(duration);
        
        // Hide celebration when audio ends
        if (duration) {
          setTimeout(() => {
            setCelebrationSale(null);
            setCelebrationAudioDuration(undefined);
          }, duration * 1000);
        }
      } else {
        // Default duration if no sound
        setTimeout(() => {
          setCelebrationSale(null);
          setCelebrationAudioDuration(undefined);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error handling celebration:', error);
      // Still show celebration even if audio fails
      setCelebrationSale(sale);
      setTimeout(() => {
        setCelebrationSale(null);
        setCelebrationAudioDuration(undefined);
      }, 3000);
    }
  };

  // Initialize
  useEffect(() => {
    loadSellers();
    loadTodaysSales();
    initializeAudio();
  }, []);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('seller-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('🔄 New sale detected:', payload.new);
          const newSale = payload.new as Sale;
          const seller = sellers.find(s => s.id === newSale.seller_id);
          
          // Trigger celebration
          handleNewSale(newSale, seller);
          
          // Refresh sales list
          loadTodaysSales();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sales' },
        () => {
          console.log('🔄 Sale deleted - refreshing');
          loadTodaysSales();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        () => {
          console.log('🔄 Sellers updated - refreshing');
          loadSellers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellers]);

  // Delete sale via edge function
  const handleDeleteSale = async (saleId: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('sales-operations', {
        body: { action: 'delete_sale', sale_id: saleId }
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      toast({
        title: "Försäljning borttagen! 🗑️",
        description: "Försäljningen har tagits bort från denna månad.",
      });

    } catch (error: any) {
      console.error('❌ Error deleting sale:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte ta bort försäljningen",
        variant: "destructive"
      });
    }
  };

  // Submit sale via edge function
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSellerId) {
      toast({
        title: "Välj säljare",
        description: "Du måste välja en säljare.",
        variant: "destructive"
      });
      return;
    }

    const hasTB = tbAmount.trim() !== '';
    const hasUnits = idUnits.trim() !== '';

    if (!hasTB && !hasUnits) {
      toast({
        title: "Fyll i minst ett fält",
        description: "Ange antingen TB-belopp eller antal ID-skydd (eller båda).",
        variant: "destructive"
      });
      return;
    }

    let numericTB = 0;
    let numericUnits = 0;

    if (hasTB) {
      numericTB = parseFloat(tbAmount);
      if (isNaN(numericTB) || numericTB <= 0) {
        toast({
          title: "Ogiltigt TB-belopp",
          description: "Ange ett giltigt TB-belopp större än 0.",
          variant: "destructive"
        });
        return;
      }
    }

    if (hasUnits) {
      numericUnits = parseInt(idUnits);
      if (isNaN(numericUnits) || numericUnits <= 0) {
        toast({
          title: "Ogiltigt antal ID-skydd",
          description: "Ange ett giltigt antal ID-skydd större än 0.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      console.log('🚀 Calling report_sale with:', {
        seller_id: selectedSellerId,
        tb_amount: hasTB ? numericTB : null,
        id_units: hasUnits ? numericUnits : null
      });

      const { data: result, error } = await supabase.functions.invoke('report_sale', {
        body: {
          seller_id: selectedSellerId,
          tb_amount: hasTB ? numericTB : undefined,
          id_units: hasUnits ? numericUnits : undefined
        }
      });

      console.log('📥 Response from report_sale:', { result, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Kunde inte ansluta till servern');
      }

      if (!result) {
        throw new Error('Inget svar från servern');
      }

      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      let description = `${selectedSeller?.name} rapporterade`;
      if (hasTB && hasUnits) {
        description += ` ${numericTB.toLocaleString('sv-SE')} TB + ${numericUnits} ID-skydd`;
      } else if (hasTB) {
        description += ` ${numericTB.toLocaleString('sv-SE')} TB`;
      } else {
        description += ` ${numericUnits} ID-skydd`;
      }

      toast({
        title: "Försäljning rapporterad! 🎉",
        description,
      });

      // Reset form
      setTbAmount('');
      setIdUnits('');
      setSelectedSellerId('');
      
    } catch (error: any) {
      console.error('❌ Sale reporting failed:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte registrera försäljning",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('sv-SE')} kr`;
  };

  const isCurrentMonth = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Celebration overlay */}
      {celebrationSale && (
        <CelebrationOverlay
          sale={celebrationSale}
          onComplete={() => {
            setCelebrationSale(null);
            setCelebrationAudioDuration(undefined);
          }}
          audioDuration={celebrationAudioDuration}
          showBubble={true}
          showConfetti={true}
        />
      )}

      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Säljrapportering</h1>
          <p className="text-gray-600">Registrera dina försäljningar här</p>
        </div>

        {/* Kombinerad rapportering */}
        <Card className="card-shadow border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              ✅ Kombinerad rapportering (ID-skydd + TB)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitSale} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller-id" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    Säljare (obligatoriskt)
                  </Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger className="smooth-transition focus:ring-primary/20 focus:border-primary">
                      <SelectValue placeholder="Välj säljare" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          <div className="flex items-center gap-2">
                            {seller.profile_image_url && (
                              <img
                                src={getCachedImage(seller.profile_image_url) || seller.profile_image_url}
                                alt={seller.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                            {seller.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tb-amount" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    TB-belopp (valfritt)
                  </Label>
                  <Input
                    id="tb-amount"
                    type="number"
                    placeholder="ex. 15000"
                    value={tbAmount}
                    onChange={(e) => setTbAmount(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmitting}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-units" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    ID-skydd (valfritt)
                  </Label>
                  <Input
                    id="id-units"
                    type="number"
                    placeholder="ex. 2"
                    value={idUnits}
                    onChange={(e) => setIdUnits(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmitting}
                    min="0"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedSellerId || ((!tbAmount || parseFloat(tbAmount) <= 0) && (!idUnits || parseInt(idUnits) <= 0))}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rapporterar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Rapportera försäljning
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 🧾 Dagens försäljningar */}
        <Card className="card-shadow border-0 mt-8">
          <CardHeader>
            <CardTitle className="text-xl text-slate-700 flex items-center gap-2">
              🧾 Dagens försäljningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysSales.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Inga försäljningar registrerade idag</p>
            ) : (
              <div className="space-y-3">
                {todaysSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${sale.is_id_skydd ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-semibold text-gray-900">{sale.seller_name}</p>
                        <p className="text-sm text-gray-600">
                          {sale.is_id_skydd 
                            ? `${sale.units} ID-skydd` 
                            : `${formatCurrency(sale.tb_amount)}`}
                          {sale.is_id_skydd && sale.tb_amount > 0 && ` + ${formatCurrency(sale.tb_amount)}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(sale.timestamp).toLocaleTimeString('sv-SE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    {isCurrentMonth(sale.created_at) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info om El Clásico tävlingen */}
        <Card className="card-shadow border-0 mt-8 bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-yellow-800 mb-2 flex items-center justify-center gap-2">
                🏆 El Clásico-tävlingen
              </h3>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Period:</strong> 1 augusti – 30 september 2025
              </p>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Mål:</strong> 2 ID-skydd per dag (totalt 86 st)
              </p>
              <p className="text-xs text-yellow-600">
                Endast ID-Bevakarna-försäljning räknas mot tävlingen. Varje försäljning = 1 ID-skydd.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Seller;