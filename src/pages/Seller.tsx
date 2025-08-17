import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, DollarSign, CheckCircle, X, Shield, CreditCard } from 'lucide-react';
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
  const [selectedSellerIdTB, setSelectedSellerIdTB] = useState('');
  const [selectedSellerIdSkydd, setSelectedSellerIdSkydd] = useState('');
  const [selectedSellerIdCombined, setSelectedSellerIdCombined] = useState('');
  const [tbAmount, setTbAmount] = useState('');
  const [idUnits, setIdUnits] = useState('');
  const [tbAmountCombined, setTbAmountCombined] = useState('');
  const [idUnitsCombined, setIdUnitsCombined] = useState('');
  const [isSubmittingTB, setIsSubmittingTB] = useState(false);
  const [isSubmittingSkydd, setIsSubmittingSkydd] = useState(false);
  const [isSubmittingCombined, setIsSubmittingCombined] = useState(false);
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
        const soundUrls = data.filter(s => s.sound_file_url).map(s => s.sound_file_url!);
        
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

  // Submit TB only
  const handleSubmitTB = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSellerIdTB || !tbAmount.trim()) {
      toast({
        title: "Fyll i alla fält",
        description: "Både säljare och TB-belopp krävs.",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(tbAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Ogiltigt belopp",
        description: "Ange ett giltigt TB-belopp.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingTB(true);

    try {
      const selectedSeller = sellers.find(s => s.id === selectedSellerIdTB);
      
      const { data: result, error } = await supabase.functions.invoke('sales-operations', {
        body: {
          action: 'create_sale',
          seller_id: selectedSellerIdTB,
          seller_name: selectedSeller?.name || '',
          amount: 0,
          tb_amount: numericAmount,
          units: 0,
          is_id_skydd: false,
          service_type: 'sstnet'
        }
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      toast({
        title: "TB-försäljning rapporterad! 🎉",
        description: `${selectedSeller?.name} sålde för ${numericAmount.toLocaleString('sv-SE')} TB`,
      });

      // Reset form
      setTbAmount('');
      setSelectedSellerIdTB('');
      
    } catch (error: any) {
      console.error('❌ TB sale reporting failed:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte registrera TB-försäljning",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTB(false);
    }
  };

  // Submit ID-skydd only
  const handleSubmitIdSkydd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSellerIdSkydd || !idUnits.trim()) {
      toast({
        title: "Fyll i alla fält",
        description: "Både säljare och antal ID-skydd krävs.",
        variant: "destructive"
      });
      return;
    }

    const numericUnits = parseInt(idUnits);
    if (isNaN(numericUnits) || numericUnits <= 0) {
      toast({
        title: "Ogiltigt antal",
        description: "Ange ett giltigt antal ID-skydd.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingSkydd(true);

    try {
      const selectedSeller = sellers.find(s => s.id === selectedSellerIdSkydd);
      
      const { data: result, error } = await supabase.functions.invoke('sales-operations', {
        body: {
          action: 'create_sale',
          seller_id: selectedSellerIdSkydd,
          seller_name: selectedSeller?.name || '',
          amount: 0,
          tb_amount: 0,
          units: numericUnits,
          is_id_skydd: true,
          service_type: 'id_bevakarna'
        }
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      toast({
        title: "ID-skydd rapporterat! 🎉",
        description: `${selectedSeller?.name} sålde ${numericUnits} ID-skydd`,
      });

      // Reset form
      setIdUnits('');
      setSelectedSellerIdSkydd('');
      
    } catch (error: any) {
      console.error('❌ ID-skydd reporting failed:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte registrera ID-skydd",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingSkydd(false);
    }
  };

  // Submit combined (ID-skydd + TB)
  const handleSubmitCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSellerIdCombined) {
      toast({
        title: "Välj säljare",
        description: "Du måste välja en säljare.",
        variant: "destructive"
      });
      return;
    }

    const hasTB = tbAmountCombined.trim() !== '';
    const hasUnits = idUnitsCombined.trim() !== '';

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
      numericTB = parseFloat(tbAmountCombined.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(numericTB) || numericTB < 0) {
        toast({
          title: "Ogiltigt TB-belopp",
          description: "Ange ett giltigt TB-belopp.",
          variant: "destructive"
        });
        return;
      }
    }

    if (hasUnits) {
      numericUnits = parseInt(idUnitsCombined);
      if (isNaN(numericUnits) || numericUnits < 0) {
        toast({
          title: "Ogiltigt antal ID-skydd",
          description: "Ange ett giltigt antal ID-skydd.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmittingCombined(true);

    try {
      const selectedSeller = sellers.find(s => s.id === selectedSellerIdCombined);
      
      const { data: result, error } = await supabase.functions.invoke('sales-operations', {
        body: {
          action: 'create_sale',
          seller_id: selectedSellerIdCombined,
          seller_name: selectedSeller?.name || '',
          amount: hasUnits ? numericTB : 0, // Use TB amount as main amount for ID-skydd sales
          tb_amount: numericTB,
          units: numericUnits,
          is_id_skydd: hasUnits,
          service_type: hasUnits ? 'combined' : 'sstnet'
        }
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

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
      setTbAmountCombined('');
      setIdUnitsCombined('');
      setSelectedSellerIdCombined('');
      
    } catch (error: any) {
      console.error('❌ Combined sale reporting failed:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte registrera försäljning",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCombined(false);
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

        {/* 💰 TB-endast rapportering */}
        <Card className="card-shadow border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              💰 Rapportera TB-försäljning
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitTB} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller-tb" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerIdTB} onValueChange={setSelectedSellerIdTB}>
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
                    TB-belopp (kr)
                  </Label>
                  <Input
                    id="tb-amount"
                    type="text"
                    placeholder="ex. 15000"
                    value={tbAmount}
                    onChange={(e) => setTbAmount(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmittingTB}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingTB || !selectedSellerIdTB || !tbAmount.trim()}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmittingTB ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rapporterar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Rapportera TB-försäljning
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 🛡️ ID-skydd-endast rapportering */}
        <Card className="card-shadow border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="w-6 h-6" />
              🛡️ Rapportera ID-skydd (El Clásico)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitIdSkydd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller-skydd" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerIdSkydd} onValueChange={setSelectedSellerIdSkydd}>
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
                  <Label htmlFor="id-units" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    Antal ID-skydd
                  </Label>
                  <Input
                    id="id-units"
                    type="number"
                    placeholder="ex. 2"
                    value={idUnits}
                    onChange={(e) => setIdUnits(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmittingSkydd}
                    min="0"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingSkydd || !selectedSellerIdSkydd || !idUnits.trim()}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmittingSkydd ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rapporterar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Rapportera ID-skydd
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 🎯 Kombinerad rapportering (ID-skydd + TB) */}
        <Card className="card-shadow border-0">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              🎯 Kombinerad rapportering (ID-skydd + TB)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitCombined} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seller-combined" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  Säljare
                </Label>
                <Select value={selectedSellerIdCombined} onValueChange={setSelectedSellerIdCombined}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tb-amount-combined" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    TB-belopp (valfritt)
                  </Label>
                  <Input
                    id="tb-amount-combined"
                    type="text"
                    placeholder="ex. 15000"
                    value={tbAmountCombined}
                    onChange={(e) => setTbAmountCombined(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmittingCombined}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-units-combined" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    ID-skydd (valfritt)
                  </Label>
                  <Input
                    id="id-units-combined"
                    type="number"
                    placeholder="ex. 2"
                    value={idUnitsCombined}
                    onChange={(e) => setIdUnitsCombined(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmittingCombined}
                    min="0"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingCombined || !selectedSellerIdCombined || (!tbAmountCombined.trim() && !idUnitsCombined.trim())}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmittingCombined ? (
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