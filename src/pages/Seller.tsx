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
}

const Seller = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerIdTB, setSelectedSellerIdTB] = useState('');
  const [selectedSellerIdSkydd, setSelectedSellerIdSkydd] = useState('');
  const [tbAmount, setTbAmount] = useState('');
  const [idUnits, setIdUnits] = useState('');
  const [isSubmittingTB, setIsSubmittingTB] = useState(false);
  const [isSubmittingSkydd, setIsSubmittingSkydd] = useState(false);
  const [todaysSales, setTodaysSales] = useState<Sale[]>([]);
  const { toast } = useToast();
  
  // Image optimization hook
  const { preloadImages, getCachedImage } = useImageCache();

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
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      toast({
        title: "Försäljning borttagen",
        description: "Försäljningen har tagits bort framgångsrikt.",
      });

      // Reload today's sales
      loadTodaysSales();
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte ta bort försäljningen.",
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
      const selectedSeller = sellers.find(s => s.id === selectedSellerIdTB);
      
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerIdTB,
            seller_name: selectedSeller?.name || '',
            service_type: 'sstnet',
            tb_amount: numericAmount,
            units: 0,
            amount: numericAmount // Keep for backwards compatibility
          }
        ]);

      if (error) throw error;

      toast({
        title: "TB-försäljning rapporterad! 🎉",
        description: `${selectedSeller?.name} sålde för ${numericAmount.toLocaleString('sv-SE')} TB`,
      });

      // Reset form and reload data
      setTbAmount('');
      setSelectedSellerIdTB('');
      loadTodaysSales();
      
    } catch (error) {
      toast({
        title: "Något gick fel",
        description: "Försök igen om en stund.",
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
      const selectedSeller = sellers.find(s => s.id === selectedSellerIdSkydd);
      
      const { error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerIdSkydd,
            seller_name: selectedSeller?.name || '',
            service_type: 'id_bevakarna',
            tb_amount: 0,
            units: numericUnits,
            amount: 0 // Keep for backwards compatibility
          }
        ]);

      if (error) throw error;

      toast({
        title: "ID-skydd rapporterat! 🛡️",
        description: `${selectedSeller?.name} sålde ${numericUnits} ID-skydd`,
      });

      // Reset form and reload data
      setIdUnits('');
      setSelectedSellerIdSkydd('');
      loadTodaysSales();
      
    } catch (error) {
      toast({
        title: "Något gick fel",
        description: "Försök igen om en stund.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingSkydd(false);
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

        {/* Två rapporteringskort enligt spec */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* 🔵 TB-sälj (SSTNET) */}
          <Card className="card-shadow border-0">
            <CardHeader className="text-center pb-4 bg-blue-50">
              <CardTitle className="text-xl text-blue-700 flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5" />
                TB-sälj (SSTNET)
              </CardTitle>
              <p className="text-sm text-blue-600">TB-belopp för standardförsäljning</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmitTB} className="space-y-4">
                {/* Säljare dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="seller-tb" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerIdTB} onValueChange={setSelectedSellerIdTB} disabled={isSubmittingTB}>
                    <SelectTrigger className="smooth-transition focus:ring-primary/20 focus:border-primary">
                      <SelectValue placeholder="Välj säljare" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                      {sellers.map((seller) => (
                        <SelectItem 
                          key={seller.id} 
                          value={seller.id}
                          className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
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
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-800" style={{display: seller.profile_image_url ? 'none' : 'flex'}}>
                              {seller.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{seller.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* TB-belopp */}
                <div className="space-y-2">
                  <Label htmlFor="tb-amount" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    TB-belopp
                  </Label>
                  <Input
                    id="tb-amount"
                    type="text"
                    placeholder="ex. 3400"
                    value={tbAmount}
                    onChange={(e) => setTbAmount(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary text-lg"
                    disabled={isSubmittingTB}
                  />
                </div>

                {/* Submit knapp */}
                <Button
                  type="submit"
                  disabled={isSubmittingTB || !selectedSellerIdTB}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
                >
                  {isSubmittingTB ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rapporterar...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Rapportera TB
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 🟢 ID-skydd (El Clásico) */}
          <Card className="card-shadow border-0">
            <CardHeader className="text-center pb-4 bg-green-50">
              <CardTitle className="text-xl text-green-700 flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                ID-skydd (El Clásico)
              </CardTitle>
              <p className="text-sm text-green-600">Antal sålda ID-skydd</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmitIdSkydd} className="space-y-4">
                {/* Säljare dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="seller-skydd" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerIdSkydd} onValueChange={setSelectedSellerIdSkydd} disabled={isSubmittingSkydd}>
                    <SelectTrigger className="smooth-transition focus:ring-primary/20 focus:border-primary">
                      <SelectValue placeholder="Välj säljare" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                      {sellers.map((seller) => (
                        <SelectItem 
                          key={seller.id} 
                          value={seller.id}
                          className="cursor-pointer hover:bg-green-50 focus:bg-green-50"
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
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800" style={{display: seller.profile_image_url ? 'none' : 'flex'}}>
                              {seller.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{seller.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Antal ID-skydd */}
                <div className="space-y-2">
                  <Label htmlFor="id-units" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Antal ID-skydd
                  </Label>
                  <Input
                    id="id-units"
                    type="number"
                    placeholder="ex. 2"
                    value={idUnits}
                    onChange={(e) => setIdUnits(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary text-lg"
                    disabled={isSubmittingSkydd}
                    min="1"
                  />
                </div>

                {/* Submit knapp */}
                <Button
                  type="submit"
                  disabled={isSubmittingSkydd || !selectedSellerIdSkydd}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
                >
                  {isSubmittingSkydd ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rapporterar...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Rapportera ID-skydd
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

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