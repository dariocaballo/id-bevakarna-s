import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Calendar, Clock, Crown, Star, Target } from 'lucide-react';
import logoImage from '@/assets/id-bevakarna-logo.png';

interface Sale {
  id: string;
  sellerName: string;
  amount: number;
  timestamp: string;
  date: string;
}

interface SellerStats {
  name: string;
  todayTotal: number;
  monthTotal: number;
  salesCount: number;
}

const Dashboard = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [latestSale, setLatestSale] = useState<Sale | null>(null);
  const [isNewSale, setIsNewSale] = useState(false);

  useEffect(() => {
    // Ladda befintliga försäljningar
    loadSales();

    // Lyssna på nya försäljningar
    const handleNewSale = (event: CustomEvent<Sale>) => {
      const newSale = event.detail;
      setLatestSale(newSale);
      setIsNewSale(true);
      
      // Spela upp ljud för ny försäljning
      playSuccessSound();
      
      // Reset animation efter 3 sekunder
      setTimeout(() => setIsNewSale(false), 3000);
      
      // Ladda om data
      setTimeout(loadSales, 100);
    };

    window.addEventListener('newSale', handleNewSale as EventListener);
    
    // Auto-refresh varje 30 sekunder
    const interval = setInterval(loadSales, 30000);

    return () => {
      window.removeEventListener('newSale', handleNewSale as EventListener);
      clearInterval(interval);
    };
  }, []);

  const loadSales = () => {
    const storedSales = JSON.parse(localStorage.getItem('sales') || '[]');
    setSales(storedSales);
  };

  const playSuccessSound = () => {
    try {
      // Skapa audio context för web audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Skapa en enkel "ka-ching" ljud
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio context not available');
    }
  };

  // Beräkna statistik
  const today = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const todaySales = sales.filter(sale => sale.date === today);
  const monthSales = sales.filter(sale => {
    const saleDate = new Date(sale.timestamp);
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
  });

  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
  const monthTotal = monthSales.reduce((sum, sale) => sum + sale.amount, 0);

  // Säljstatistik
  const sellerStats = sales.reduce((stats, sale) => {
    const name = sale.sellerName;
    if (!stats[name]) {
      stats[name] = { name, todayTotal: 0, monthTotal: 0, salesCount: 0 };
    }
    
    stats[name].salesCount++;
    
    if (sale.date === today) {
      stats[name].todayTotal += sale.amount;
    }
    
    const saleDate = new Date(sale.timestamp);
    if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
      stats[name].monthTotal += sale.amount;
    }
    
    return stats;
  }, {} as Record<string, SellerStats>);

  const topSellersByMonth = Object.values(sellerStats)
    .sort((a, b) => b.monthTotal - a.monthTotal)
    .slice(0, 5);

  const topSellersByToday = Object.values(sellerStats)
    .sort((a, b) => b.todayTotal - a.todayTotal)
    .slice(0, 5);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background p-4 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white p-2 card-shadow">
          <img 
            src={logoImage} 
            alt="ID-Bevakarna" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <h1 className="text-5xl font-bold text-primary mb-2">ID-Bevakarna</h1>
        <p className="text-xl text-muted-foreground">Säljdashboard</p>
        <p className="text-sm text-muted-foreground mt-2">
          Uppdaterad: {new Date().toLocaleTimeString('sv-SE')}
        </p>
      </div>

      {/* Senaste försäljning */}
      {latestSale && (
        <div className={`mb-8 ${isNewSale ? 'animate-celebration' : ''}`}>
          <Card className={`card-shadow border-success/20 ${isNewSale ? 'success-gradient text-white' : 'bg-success/5'}`}>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className={`w-6 h-6 ${isNewSale ? 'text-white' : 'text-success'}`} />
                <h2 className={`text-2xl font-bold ${isNewSale ? 'text-white' : 'text-success'}`}>
                  Senaste försäljning!
                </h2>
                <Star className={`w-6 h-6 ${isNewSale ? 'text-white' : 'text-success'}`} />
              </div>
              <p className={`text-3xl font-bold ${isNewSale ? 'text-white' : 'text-success'}`}>
                {latestSale.sellerName} sålde för {formatCurrency(latestSale.amount)}!
              </p>
              <p className={`text-sm ${isNewSale ? 'text-white/80' : 'text-success/70'} mt-2`}>
                {formatTime(latestSale.timestamp)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Huvudstatistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-shadow hero-gradient text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Idag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-1">{formatCurrency(todayTotal)}</p>
            <p className="text-white/80 text-sm">{todaySales.length} försäljningar</p>
          </CardContent>
        </Card>

        <Card className="card-shadow success-gradient text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Månaden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-1">{formatCurrency(monthTotal)}</p>
            <p className="text-white/80 text-sm">{monthSales.length} försäljningar</p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Genomsnitt/dag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary mb-1">
              {monthSales.length > 0 ? formatCurrency(monthTotal / new Date().getDate()) : formatCurrency(0)}
            </p>
            <p className="text-muted-foreground text-sm">Denna månad</p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Trophy className="w-5 h-5" />
              Aktiva säljare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary mb-1">
              {Object.keys(sellerStats).length}
            </p>
            <p className="text-muted-foreground text-sm">Totalt</p>
          </CardContent>
        </Card>
      </div>

      {/* Topplistor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dagens topplista */}
        <Card className="card-shadow border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Dagens topplista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellersByToday.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Inga försäljningar idag än...
                </p>
              ) : (
                topSellersByToday.map((seller, index) => (
                  <div key={seller.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 smooth-transition hover:bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-yellow-600' : 'bg-muted'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{seller.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {seller.salesCount} försäljningar
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                      {formatCurrency(seller.todayTotal)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Månadens topplista */}
        <Card className="card-shadow border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Crown className="w-6 h-6 text-primary" />
              Månadens topplista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellersByMonth.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Inga försäljningar denna månad än...
                </p>
              ) : (
                topSellersByMonth.map((seller, index) => (
                  <div key={seller.name} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 smooth-transition hover:bg-primary/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'hero-gradient' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-yellow-600' : 'bg-muted'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{seller.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {seller.salesCount} försäljningar
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg font-bold px-3 py-1 border-primary text-primary">
                      {formatCurrency(seller.monthTotal)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>ID-Bevakarna Säljsystem v1.0 | 
          <a 
            href="/seller" 
            className="text-primary hover:text-primary-glow smooth-transition ml-1"
          >
            Rapportera försäljning
          </a>
        </p>
      </div>
    </div>
  );
};

export default Dashboard;