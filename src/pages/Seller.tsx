import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, User, DollarSign, CheckCircle, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Sale {
  id: string;
  seller_name: string;
  amount: number;
  timestamp: string;
}

const Seller = () => {
  const [sellerName, setSellerName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentSales();
    
    // Auto-refresh recent sales every 10 seconds
    const interval = setInterval(loadRecentSales, 10000);
    return () => clearInterval(interval);
  }, []);

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
    
    if (!sellerName.trim() || !amount.trim()) {
      toast({
        title: "Fyll i alla fält",
        description: "Både namn och belopp krävs för att rapportera försäljning.",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Ogiltigt belopp",
        description: "Ange ett giltigt belopp i kronor.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Supabase
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            seller_name: sellerName.trim(),
            amount: numericAmount
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Play applause sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1+y/ayEFJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCw==');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (autoplay restrictions)
      });

      toast({
        title: "Försäljning rapporterad! 🎉",
        description: `${sellerName} sålde för ${numericAmount.toLocaleString('sv-SE')} kr`,
        className: "success-gradient text-white border-success"
      });

      // Reset form
      setAmount('');
      setSellerName('');
      
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
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
              {/* Säljare namn */}
              <div className="space-y-2">
                <Label htmlFor="sellerName" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Säljare
                </Label>
                <Input
                  id="sellerName"
                  type="text"
                  placeholder="Skriv ditt namn"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="smooth-transition focus:ring-primary/20 focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>

              {/* Belopp */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Belopp (kr)
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
                disabled={isSubmitting}
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
                      <Trash2 className="w-4 h-4" />
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