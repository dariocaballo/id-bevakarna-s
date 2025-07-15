import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, User, DollarSign, CheckCircle, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playApplauseSound } from '@/utils/sound';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount: number;
  timestamp: string;
}

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
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSellers();
    loadRecentSales();
    
    // Real-time listeners for sellers and sales
    const sellersChannel = supabase
      .channel('seller-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        (payload) => {
          console.log('Seller update:', payload);
          loadSellers(); // Reload sellers when changes occur
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Sales update:', payload);
          loadRecentSales(); // Reload recent sales when changes occur
        }
      )
      .subscribe();
    
    // Auto-refresh recent sales every 10 seconds
    const interval = setInterval(loadRecentSales, 10000);
    
    return () => {
      supabase.removeChannel(sellersChannel);
      clearInterval(interval);
    };
  }, []);

  const loadSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda säljare",
        variant: "destructive",
      });
    }
  };

  const loadRecentSales = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setRecentSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        description: "Ange ett giltigt belopp i tb.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            seller_id: selectedSellerId,
            seller_name: selectedSeller?.name || '',
            amount: numericAmount
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Play custom sound if available, otherwise default applause
      if (selectedSeller?.sound_file_url) {
        const audio = new Audio(selectedSeller.sound_file_url);
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Fallback to default sound
          playApplauseSound();
        });
      } else {
        playApplauseSound();
      }

      toast({
        title: "Försäljning rapporterad! 🎉",
        description: `${selectedSeller?.name} sålde för ${numericAmount.toLocaleString('sv-SE')} tb`,
        className: "success-gradient text-white border-success"
      });

      // Reset form
      setAmount('');
      setSelectedSellerId('');
      
      // Update recent sales list
      loadRecentSales();
      
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

  const handleDeleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
      
      toast({
        title: "Försäljning borttagen",
        description: "Försäljningen har tagits bort och statistiken uppdaterats.",
        className: "text-white border-success bg-success"
      });
      
      // Update recent sales list
      loadRecentSales();
      
    } catch (error) {
      toast({
        title: "Fel vid borttagning",
        description: "Kunde inte ta bort försäljningen.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' tb';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-md mx-auto pt-16">
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

        {/* Huvudformulär */}
        <Card className="card-shadow border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-primary">Rapportera ny försäljning</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Säljare dropdown */}
              <div className="space-y-2">
                <Label htmlFor="seller" className="text-sm font-medium flex items-center gap-2">
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
                              src={seller.profile_image_url} 
                              alt={seller.name} 
                              className="w-6 h-6 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-800">
                              {seller.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{seller.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Belopp */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Belopp (tb)
                </Label>
                <Input
                  id="amount"
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
                className="w-full h-12 hero-gradient text-white font-semibold primary-shadow smooth-transition hover:scale-105 disabled:hover:scale-100"
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

        {/* Senaste försäljningar */}
        {recentSales.length > 0 && (
          <Card className="card-shadow border-0 mt-6">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg text-primary flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                Dagens senaste försäljningar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/10 smooth-transition hover:bg-accent/20">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{sale.seller_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(sale.timestamp)} • {formatCurrency(sale.amount)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>ID-Bevakarna Säljsystem v1.0</p>
          <p className="mt-2">
            <a 
              href="/dashboard" 
              className="text-primary hover:text-primary-glow smooth-transition"
            >
              Visa dashboard →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Seller;