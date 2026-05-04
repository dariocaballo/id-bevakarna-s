import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SaleDeleteButton } from '@/components/SaleDeleteButton';
import { getVersionedUrl } from '@/utils/media';
import { dataApi } from '@/utils/dataApi';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  updated_at?: string;
}

const Sales = () => {
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [tb, setTb] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todaysSales, setTodaysSales] = useState<any[]>([]);
  const { toast } = useToast();

  // Load sellers from database with retry logic
  const loadSellers = async (retryCount = 0): Promise<void> => {
    try {
      const result = await dataApi<{ sellers: Seller[] }>('list_sellers');
      setSellers(result.sellers || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadSellers(retryCount + 1);
      }
      toast({
        title: "Fel",
        description: "Kunde inte ladda säljare. Försöker igen...",
        variant: "destructive"
      });
      
      // Keep trying in background if initial load fails
      if (retryCount === 0) {
        setTimeout(() => loadSellers(1), 2000);
      }
    }
  };

  // Load remembered seller selection
  useEffect(() => {
    const remembered = localStorage.getItem('selected-seller-id');
    if (remembered) {
      setSelectedSellerId(remembered);
    }
  }, []);

  // Save seller selection to localStorage
  useEffect(() => {
    if (selectedSellerId) {
      localStorage.setItem('selected-seller-id', selectedSellerId);
    }
  }, [selectedSellerId]);

  // Load today's sales with retry logic
  const loadTodaysSales = async (retryCount = 0): Promise<void> => {
    try {
      const result = await dataApi<{ sales: any[] }>('todays_sales');
      setTodaysSales(result.sales || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadTodaysSales(retryCount + 1);
      }
      // Keep existing data on error
    }
  };

  useEffect(() => {
    loadSellers();
    loadTodaysSales();

    // Subscribe to realtime changes for both sellers and sales
    const channel = supabase
      .channel('seller-sales-realtime-v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => loadTodaysSales()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sales' },
        () => loadTodaysSales()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sales' },
        () => loadTodaysSales()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sellers' },
        () => loadSellers()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sellers' },
        () => loadSellers()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sellers' },
        () => loadSellers()
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Sales page realtime connected');
        } else if (err) {
          console.error('Realtime error:', err);
        }
      });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSellers();
        loadTodaysSales();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSellerId) {
      toast({
        title: "Välj en säljare",
        description: "Du måste välja en säljare från listan.",
        variant: "destructive"
      });
      return;
    }

    const tbNumber = parseFloat(tb);
    if (isNaN(tbNumber) || tbNumber <= 0) {
      toast({
        title: "Ogiltigt TB-belopp",
        description: "Ange ett giltigt TB-belopp större än 0.",
        variant: "destructive"
      });
      return;
    }

    const selectedSeller = sellers.find(s => s.id === selectedSellerId);
    if (!selectedSeller) {
      toast({
        title: "Fel",
        description: "Vald säljare hittades inte.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await dataApi('report_sale', {
        sellerId: selectedSellerId,
        sellerName: selectedSeller.name,
        tb: tbNumber
      });

      const description = `${selectedSeller.name} rapporterade ${tbNumber.toLocaleString('sv-SE')} tb`;

      toast({
        title: "Försäljning rapporterad! 🎉",
        description,
      });

      // Reset form (keep seller selection)
      setTb('');
      
    } catch (error: any) {
      toast({
        title: "Fel",
        description: error.message || "Kunde inte registrera försäljning",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Säljrapportering</h1>
          <p className="text-gray-600">Rapportera dina försäljningar enkelt och snabbt</p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Ny försäljning
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seller Selection */}
              <div className="space-y-2">
                <Label htmlFor="seller-select" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Välj säljare
                </Label>
                <Select 
                  value={selectedSellerId} 
                  onValueChange={setSelectedSellerId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Välj en säljare från listan" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        <div className="flex items-center gap-2">
                          {seller.profile_image_url ? (
                            <img 
                              src={getVersionedUrl(seller.profile_image_url, seller.updated_at) || seller.profile_image_url} 
                              alt={seller.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">
                                {seller.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {seller.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Ditt val sparas för framtida rapporter</p>
              </div>

              {/* TB Amount */}
              <div className="space-y-2">
                <Label htmlFor="tb-amount" className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  TB-belopp
                </Label>
                <Input
                  id="tb-amount"
                  type="number"
                  placeholder="ex. 15000"
                  value={tb}
                  onChange={(e) => setTb(e.target.value)}
                  className="h-12"
                  disabled={isSubmitting}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !selectedSellerId || !tb.trim()}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rapporterar...
                  </div>
                ) : (
                  "Rapportera försäljning"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Sales */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">
              📊 Dagens försäljningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysSales.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Inga försäljningar registrerade idag</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                 {todaysSales.map((sale) => (
                   <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                     <div>
                       <p className="font-semibold text-gray-900">{sale.seller_name}</p>
                       <p className="text-sm text-gray-600">
                         {sale.amount_tb.toLocaleString('sv-SE')} tb
                       </p>
                       <p className="text-xs text-gray-500">
                         {new Date(sale.timestamp).toLocaleTimeString('sv-SE', { 
                           hour: '2-digit', 
                           minute: '2-digit' 
                         })}
                       </p>
                     </div>
                     <SaleDeleteButton
                       saleId={sale.id}
                       sellerName={sale.seller_name}
                       amount={sale.amount_tb}
                       onDeleted={loadTodaysSales}
                     />
                   </div>
                 ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sales;
