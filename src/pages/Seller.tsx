import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, DollarSign, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImageCache } from '@/hooks/useImageCache';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  monthly_goal: number;
}

const Seller = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<'sstnet' | 'id-bevakarna'>('sstnet');
  const { toast } = useToast();
  
  // Image optimization hook
  const { preloadImages, getCachedImage } = useImageCache();

  useEffect(() => {
    loadSellers();
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

  const handleSubmit = async (e: React.FormEvent, submissionServiceType: 'sstnet' | 'id-bevakarna') => {
    e.preventDefault();
    
    if (!selectedSellerId || !amount.trim()) {
      toast({
        title: "Fyll i alla fält",
        description: "Både säljare och belopp krävs för att rapportera försäljning.",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Ogiltigt belopp",
        description: "Ange ett giltigt belopp i TB.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      
      // Save to Supabase with service_type
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerId,
            seller_name: selectedSeller?.name || '',
            amount: numericAmount,
            service_type: submissionServiceType
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // NO AUDIO on seller page - only dashboard plays sounds and celebrates
      console.log('✅ Sale saved to database - dashboard will handle celebration via realtime');

      const serviceDisplayName = submissionServiceType === 'sstnet' ? 'SSTNET' : 'ID-Bevakarna';
      toast({
        title: `${serviceDisplayName} försäljning rapporterad! 🎉`,
        description: `${selectedSeller?.name} sålde för ${numericAmount.toLocaleString('sv-SE')} TB`,
        className: "success-gradient text-white border-success"
      });

      // Reset form
      setAmount('');
      setSelectedSellerId('');
      
    } catch (error) {
      toast({
        title: "Något gick fel",
        description: "Försök igen om en stund.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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
          
          {/* 1️⃣ Rapportera SSTNET */}
          <Card className="card-shadow border-0">
            <CardHeader className="text-center pb-4 bg-blue-50">
              <CardTitle className="text-xl text-blue-700">Rapportera SSTNET</CardTitle>
              <p className="text-sm text-blue-600">Standardförsäljning</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => handleSubmit(e, 'sstnet')} className="space-y-4">
                {/* Säljare dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="seller-sstnet" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId} disabled={isSubmitting}>
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

                {/* Belopp */}
                <div className="space-y-2">
                  <Label htmlFor="amount-sstnet" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Belopp (TB)
                  </Label>
                  <Input
                    id="amount-sstnet"
                    type="text"
                    placeholder="ex. 15 000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary text-lg"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit knapp */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedSellerId}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rapporterar...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Rapportera
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 2️⃣ Rapportera ID-Bevakarna */}
          <Card className="card-shadow border-0">
            <CardHeader className="text-center pb-4 bg-green-50">
              <CardTitle className="text-xl text-green-700">Rapportera ID-Bevakarna</CardTitle>
              <p className="text-sm text-green-600">ID-skydd (räknas mot El Clásico)</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => handleSubmit(e, 'id-bevakarna')} className="space-y-4">
                {/* Säljare dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="seller-id" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Säljare
                  </Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId} disabled={isSubmitting}>
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

                {/* Belopp */}
                <div className="space-y-2">
                  <Label htmlFor="amount-id" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Belopp (TB)
                  </Label>
                  <Input
                    id="amount-id"
                    type="text"
                    placeholder="ex. 15 000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="smooth-transition focus:ring-primary/20 focus:border-primary text-lg"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit knapp */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedSellerId}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold smooth-transition hover:scale-105 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rapporterar...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Rapportera
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

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