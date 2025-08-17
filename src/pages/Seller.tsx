import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { User, DollarSign, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Seller = () => {
  const [sellerName, setSellerName] = useState('');
  const [tb, setTb] = useState('');
  const [salesCount, setSalesCount] = useState('');
  const [isElClasico, setIsElClasico] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todaysSales, setTodaysSales] = useState<any[]>([]);
  const { toast } = useToast();

  // Load remembered seller name
  useEffect(() => {
    const remembered = localStorage.getItem('seller-name');
    if (remembered) {
      setSellerName(remembered);
    }
  }, []);

  // Save seller name to localStorage
  useEffect(() => {
    if (sellerName.trim()) {
      localStorage.setItem('seller-name', sellerName.trim());
    }
  }, [sellerName]);

  // Load today's sales
  const loadTodaysSales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('timestamp', `${today}T00:00:00.000Z`)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setTodaysSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  useEffect(() => {
    loadTodaysSales();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => loadTodaysSales()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sellerName.trim()) {
      toast({
        title: "Fyll i ditt namn",
        description: "Ditt namn måste anges.",
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

    let salesNumber = undefined;
    if (isElClasico) {
      salesNumber = parseInt(salesCount);
      if (isNaN(salesNumber) || salesNumber <= 0) {
        toast({
          title: "Ogiltigt antal sälj",
          description: "Ange ett giltigt antal sälj för El Clásico.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      console.log('🚀 Submitting sale:', {
        sellerName: sellerName.trim(),
        tb: tbNumber,
        salesCount: salesNumber
      });

      const { data, error } = await supabase.functions.invoke('report_sale', {
        body: {
          sellerName: sellerName.trim(),
          tb: tbNumber,
          salesCount: salesNumber
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Kunde inte ansluta till servern');
      }

      console.log('✅ Sale reported successfully:', data);

      let description = `${sellerName} rapporterade ${tbNumber.toLocaleString('sv-SE')} tb`;
      if (isElClasico && salesNumber) {
        description += ` + ${salesNumber} sälj (El Clásico)`;
      }

      toast({
        title: "Försäljning rapporterad! 🎉",
        description,
      });

      // Reset form (keep seller name)
      setTb('');
      setSalesCount('');
      setIsElClasico(false);
      
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
              {/* Seller Name */}
              <div className="space-y-2">
                <Label htmlFor="seller-name" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Ditt namn
                </Label>
                <Input
                  id="seller-name"
                  type="text"
                  placeholder="Ange ditt namn"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="h-12"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-gray-500">Ditt namn sparas för framtida rapporter</p>
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

              {/* El Clasico Toggle */}
              <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="el-clasico"
                    checked={isElClasico}
                    onCheckedChange={setIsElClasico}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="el-clasico" className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    El Clásico-tävlingen
                  </Label>
                </div>

                {isElClasico && (
                  <div className="space-y-2">
                    <Label htmlFor="sales-count" className="text-sm font-medium">
                      Antal sälj
                    </Label>
                    <Input
                      id="sales-count"
                      type="number"
                      placeholder="ex. 2"
                      value={salesCount}
                      onChange={(e) => setSalesCount(e.target.value)}
                      className="h-10"
                      disabled={isSubmitting}
                      min="1"
                      required={isElClasico}
                    />
                    <p className="text-xs text-yellow-700">
                      Antal sälj för El Clásico-tävlingen (1 aug - 30 sep 2025)
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !sellerName.trim() || !tb.trim() || (isElClasico && !salesCount.trim())}
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
                        {sale.sales_count && ` + ${sale.sales_count} sälj`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.timestamp).toLocaleTimeString('sv-SE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
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

export default Seller;
