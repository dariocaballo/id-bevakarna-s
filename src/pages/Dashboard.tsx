import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Users, DollarSign, Trophy, Clock, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface Sale {
  id: string;
  seller_name: string;
  amount: number;
  timestamp: string;
}

interface SellerData {
  name: string;
  amount: number;
}

const Dashboard = () => {
  const [totalToday, setTotalToday] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [topSellers, setTopSellers] = useState<{name: string, amount: number}[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [chartData, setChartData] = useState<{name: string, amount: number}[]>([]);

  useEffect(() => {
    loadSalesData();
    
    // Listen for real-time updates from Supabase
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Real-time update:', payload);
          if (payload.eventType === 'INSERT') {
            setLastSale(payload.new as Sale);
            playApplauseSound();
          }
          loadSalesData();
        }
      )
      .subscribe();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSalesData, 30000);
    
    return () => {
      supabase.removeChannel(salesChannel);
      clearInterval(interval);
    };
  }, []);

  const loadSalesData = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get all sales
      const { data: allSales, error } = await supabase
        .from('sales')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const sales = allSales || [];
      
      // Calculate today's total
      const todaysSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= today;
      });
      const todaysTotal = todaysSales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
      setTotalToday(todaysTotal);
      
      // Calculate month's total
      const monthsSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= monthStart;
      });
      const monthsTotal = monthsSales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
      setTotalMonth(monthsTotal);
      
      // Calculate top sellers (month)
      const sellerTotals: { [key: string]: number } = {};
      monthsSales.forEach((sale: Sale) => {
        sellerTotals[sale.seller_name] = (sellerTotals[sale.seller_name] || 0) + sale.amount;
      });
      
      const topSellersArray = Object.entries(sellerTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      setTopSellers(topSellersArray);
      setChartData(topSellersArray);
      
      // Get last sale
      if (sales.length > 0) {
        setLastSale(sales[0]);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const playApplauseSound = () => {
    try {
      // Create a simple applause sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a buffer for white noise (applause-like)
      const bufferSize = audioContext.sampleRate * 2; // 2 seconds
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = buffer;
      
      // Apply filters to make it sound more like applause
      const filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(1000, audioContext.currentTime);
      filterNode.Q.setValueAtTime(0.5, audioContext.currentTime);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
      
      whiteNoise.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      whiteNoise.start(audioContext.currentTime);
      whiteNoise.stop(audioContext.currentTime + 1.5);
    } catch (error) {
      console.log('Audio context not available, falling back to simple audio');
      // Fallback to simple audio
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1+y/ayEFJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCwxOp+DyvmEcAzaN0+u6ayEBJHfH6tOAMQYVXrTp3ZdQCw==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white p-3 card-shadow">
            <img 
              src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
              alt="ID-Bevakarna" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-primary mb-2">ID-Bevakarna</h1>
          <p className="text-xl text-muted-foreground">Live Säljdashboard</p>
          <p className="text-sm text-muted-foreground mt-2">
            Uppdaterad: {new Date().toLocaleTimeString('sv-SE')}
          </p>
        </div>

        {/* Statistikkort */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="card-shadow border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dagens försäljning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-1">
                {formatCurrency(totalToday)}
              </div>
              <p className="text-sm text-muted-foreground">
                Totalt idag
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Månadens försäljning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-1">
                {formatCurrency(totalMonth)}
              </div>
              <p className="text-sm text-muted-foreground">
                Totalt denna månad
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Senaste försäljning */}
        {lastSale && (
          <Card className="card-shadow border-0 mb-8 overflow-hidden">
            <div className="bg-success-gradient p-1">
              <div className="bg-card rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Senaste försäljning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary mb-1">
                        {lastSale.seller_name}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {formatCurrency(lastSale.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(lastSale.timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(lastSale.timestamp)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        )}

        {/* Stapeldiagram */}
        {chartData.length > 0 && (
          <Card className="card-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Månadens försäljning per säljare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Försäljning']}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      className="animate-fade-in"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topplista */}
        <Card className="card-shadow border-0 mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Månadens topplista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Inga försäljningar registrerade än...
                </p>
              ) : (
                topSellers.map((seller, index) => (
                  <div 
                    key={seller.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent/10 smooth-transition hover:bg-accent/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-yellow-600' : 'bg-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {seller.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Säljare
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(seller.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>ID-Bevakarna Säljsystem v2.0 | 
            <a 
              href="/seller" 
              className="text-primary hover:text-primary-glow smooth-transition ml-1"
            >
              Rapportera försäljning
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;