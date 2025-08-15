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
import { useAuth } from '@/hooks/useAuth';

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
  tb_amount: number;
  units: number;
  service_type: string;
  timestamp: string;
  is_id_skydd?: boolean;
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
  const { toast } = useToast();
  
  // Auth and image optimization hooks
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { preloadImages, getCachedImage } = useImageCache();
  
  // Get user's sellers
  const [userSellers, setUserSellers] = useState<Seller[]>([]);

  // Load user's assigned sellers
  useEffect(() => {
    const loadUserSellers = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setUserSellers(data || []);
      } catch (error) {
        console.error('❌ Error loading user sellers:', error);
      }
    };

    loadUserSellers();
  }, [user]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth';
    }
  }, [authLoading, isAuthenticated]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('seller-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          console.log('🔄 Sales updated - refreshing seller view');
          loadTodaysSales();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        () => {
          console.log('🔄 Sellers updated - refreshing seller view');
          loadSellers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    loadSellers();
    loadTodaysSales();
  }, []);

  const loadSellers = async () => {
    try {
      console.log('👥 Loading sellers...');
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('name');

      if (error) throw error;
      
      const sellersData = data || [];
      setSellers(sellersData);
      
      // Preload images
      if (sellersData.length > 0) {
        console.log('🖼️ Preloading seller images...');
        
        const imageUrls = sellersData
          .map(seller => seller.profile_image_url)
          .filter(url => url) as string[];
        
        if (imageUrls.length > 0) {
          preloadImages(imageUrls);
        }
      }
      
      console.log('✅ Sellers loaded successfully:', sellersData.length);
    } catch (error) {
      console.error('❌ Error loading sellers:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda säljare",
        variant: "destructive",
      });
    }
  };

  const loadTodaysSales = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('timestamp', startOfDay)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setTodaysSales(data || []);
    } catch (error) {
      console.error('❌ Error loading today\'s sales:', error);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      // Check if sale is from current month
      const sale = todaysSales.find(s => s.id === saleId);
      if (!sale) {
        toast({
          title: "Fel",
          description: "Försäljningen kunde inte hittas.",
          variant: "destructive"
        });
        return;
      }

      const saleDate = new Date(sale.timestamp);
      const now = new Date();
      const isCurrentMonth = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();

      if (!isCurrentMonth) {
        toast({
          title: "Kan inte ta bort",
          description: "Du kan endast ta bort försäljningar från innevarande månad.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        console.error('❌ Delete sale failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('🗑️ Sale deleted successfully:', saleId);
      toast({
        title: "Försäljning borttagen! 🗑️",
        description: "Försäljningen har tagits bort från denna månad.",
      });

      // Real-time will handle the refresh automatically
      loadTodaysSales(); // Refresh immediately for UI feedback
    } catch (error) {
      console.error('❌ Error deleting sale:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort försäljningen. Kontrollera att du har rätt behörigheter.",
        variant: "destructive"
      });
    }
  };

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
      const selectedSeller = userSellers.find(s => s.id === selectedSellerIdTB);
      
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerIdTB,
            seller_name: selectedSeller?.name || '',
            service_type: 'sstnet',
            tb_amount: numericAmount,
            units: 0,
            is_id_skydd: false,
            amount: numericAmount // Keep for backwards compatibility
          }
        ]);

      if (error) throw error;

      toast({
        title: "TB-försäljning rapporterad! 🎉",
        description: `${selectedSeller?.name} sålde för ${numericAmount.toLocaleString('sv-SE')} TB`,
      });

      console.log('🎯 TB sale reported:', {
        seller_id: selectedSellerIdTB,
        seller_name: selectedSeller?.name,
        tb_amount: numericAmount,
        is_id_skydd: false
      });

      // Reset form - real-time will handle updates
      setTbAmount('');
      setSelectedSellerIdTB('');
      
    } catch (error) {
      console.error('❌ TB sale reporting failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      toast({
        title: "Något gick fel",
        description: error.message || "Försök igen om en stund.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTB(false);
    }
  };

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
      const selectedSeller = userSellers.find(s => s.id === selectedSellerIdSkydd);
      
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerIdSkydd,
            seller_name: selectedSeller?.name || '',
            service_type: 'id_bevakarna',
            tb_amount: 0,
            units: numericUnits,
            is_id_skydd: true,
            amount: 0 // Keep for backwards compatibility
          }
        ]);

      if (error) throw error;

      toast({
        title: "ID-skydd rapporterat! 🛡️",
        description: `${selectedSeller?.name} sålde ${numericUnits} ID-skydd`,
      });

      console.log('🎯 ID-skydd sale reported:', {
        seller_id: selectedSellerIdSkydd,
        seller_name: selectedSeller?.name,
        units: numericUnits,
        is_id_skydd: true
      });

      // Reset form - real-time will handle updates
      setIdUnits('');
      setSelectedSellerIdSkydd('');
      
    } catch (error) {
      console.error('❌ ID-skydd sale reporting failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      toast({
        title: "Något gick fel",
        description: error.message || "Försök igen om en stund.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingSkydd(false);
    }
  };

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

    const hasTB = tbAmountCombined.trim();
    const hasUnits = idUnitsCombined.trim();

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
      const selectedSeller = userSellers.find(s => s.id === selectedSellerIdCombined);
      
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerIdCombined,
            seller_name: selectedSeller?.name || '',
            service_type: hasUnits ? 'combined' : 'sstnet',
            tb_amount: numericTB,
            units: numericUnits,
            is_id_skydd: !!hasUnits,
            amount: numericTB // Keep for backwards compatibility
          }
        ]);

      if (error) throw error;

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

      console.log('🎯 Combined sale reported:', {
        seller_id: selectedSellerIdCombined,
        seller_name: selectedSeller?.name,
        tb_amount: numericTB,
        units: numericUnits,
        is_id_skydd: hasUnits
      });

      // Reset form - real-time will handle updates
      setTbAmountCombined('');
      setIdUnitsCombined('');
      setSelectedSellerIdCombined('');
      
    } catch (error) {
      console.error('❌ Combined sale reporting failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      toast({
        title: "Något gick fel",
        description: error.message || "Försök igen om en stund.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCombined(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' TB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-2xl mx-auto pt-16">
        {/* Logo och rubrik */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white p-2 card-shadow">
            <img 
              src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
              alt="ID-Bevakarna" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">ID-Bevakarna</h1>
          <p className="text-muted-foreground">Säljrapportering</p>
        </div>

          {/* Kombinerad rapportering för TB + ID-skydd */}
        <Card className="card-shadow border-0 mb-6">
          <CardHeader className="text-center pb-4 bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="text-xl text-slate-700 flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" />
              <Shield className="w-5 h-5" />
              Kombinerad rapportering
            </CardTitle>
            <p className="text-sm text-slate-600">Rapportera TB och/eller ID-skydd samtidigt</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitCombined} className="space-y-4">
              {/* Säljare dropdown */}
              <div className="space-y-2">
                <Label htmlFor="seller-combined" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Säljare
                </Label>
                <Select value={selectedSellerIdCombined} onValueChange={setSelectedSellerIdCombined} disabled={isSubmittingCombined}>
                  <SelectTrigger className="smooth-transition focus:ring-primary/20 focus:border-primary">
                    <SelectValue placeholder="Välj säljare" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                    {userSellers.map((seller) => (
                      <SelectItem 
                        key={seller.id} 
                        value={seller.id}
                        className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 w-full">
                          {seller.profile_image_url ? (
                            <img 
                              src={getCachedImage(seller.profile_image_url) || seller.profile_image_url}
                              alt={seller.name} 
                              className="w-6 h-6 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-800" style={{display: seller.profile_image_url ? 'none' : 'flex'}}>
                            {seller.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{seller.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* TB-belopp */}
                <div className="space-y-2">
                  <Label htmlFor="tb-amount-combined" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    TB-belopp (valfritt)
                  </Label>
                  <Input
                    id="tb-amount-combined"
                    type="text"
                    placeholder="ex. 3400"
                    value={tbAmountCombined}
                    onChange={(e) => setTbAmountCombined(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmittingCombined}
                  />
                </div>

                {/* Antal ID-skydd */}
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

              {/* Submit knapp */}
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

        {/* 🧾 Mina försäljningar - dagens lista */}
        <Card className="card-shadow border-0 mt-8">
          <CardHeader>
            <CardTitle className="text-xl text-slate-700 flex items-center gap-2">
              🧾 Mina försäljningar (idag)
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
                      <div className={`w-3 h-3 rounded-full ${sale.service_type === 'id_bevakarna' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-semibold text-gray-900">{sale.seller_name}</p>
                        <p className="text-sm text-gray-600">
                          {sale.service_type === 'id_bevakarna' 
                            ? `${sale.units} ID-skydd` 
                            : `${formatCurrency(sale.tb_amount)}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(sale.timestamp).toLocaleTimeString('sv-SE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
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