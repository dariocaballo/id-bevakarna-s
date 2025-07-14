import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, User, DollarSign, CheckCircle } from 'lucide-react';
import logoImage from '@/assets/id-bevakarna-logo.png';

const Seller = () => {
  const [sellerName, setSellerName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      // Här kommer Supabase-integrationen att användas
      // För nu simulerar vi med localStorage för demo
      const sale = {
        id: Date.now().toString(),
        sellerName: sellerName.trim(),
        amount: numericAmount,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
      };

      // Lägg till i localStorage (temporär lösning tills Supabase)
      const existingSales = JSON.parse(localStorage.getItem('sales') || '[]');
      existingSales.push(sale);
      localStorage.setItem('sales', JSON.stringify(existingSales));

      // Trigger custom event för realtidsuppdatering
      window.dispatchEvent(new CustomEvent('newSale', { detail: sale }));

      toast({
        title: "Försäljning rapporterad! 🎉",
        description: `${sellerName} sålde för ${numericAmount.toLocaleString('sv-SE')} kr`,
        className: "success-gradient text-white border-success"
      });

      // Reset form
      setAmount('');
      setSellerName('');
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-md mx-auto pt-16">
        {/* Logo och rubrik */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white p-2 card-shadow">
            <img 
              src={logoImage} 
              alt="ID-Bevakarna" 
              className="w-full h-full object-contain rounded-full"
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