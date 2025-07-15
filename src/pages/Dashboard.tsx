import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Users, DollarSign, Trophy, Clock, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { playApplauseSound } from '@/utils/sound';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
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
  const [topSellers, setTopSellers] = useState<{name: string, amount: number, imageUrl?: string, goal?: number, progress?: number}[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [chartData, setChartData] = useState<{name: string, amount: number}[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [sellers, setSellers] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [kingQueen, setKingQueen] = useState<any>(null);

  useEffect(() => {
    loadSalesData();
    loadSettings();
    loadSellers();
    loadChallenges();
    
    // Listen for real-time updates from all relevant tables
    const salesChannel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Sales update:', payload);
          if (payload.eventType === 'INSERT') {
            const newSale = payload.new as Sale;
            setLastSale(newSale);
            
            // Play custom sound for seller if available
            const seller = sellers.find(s => s.id === newSale.seller_id);
            if (seller?.sound_file_url && settings.sounds_enabled !== false) {
              const audio = new Audio(seller.sound_file_url);
              audio.play().catch(console.error);
            } else {
              playApplauseSound();
            }
          }
          loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_settings' },
        () => {
          console.log('Settings update');
          loadSettings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        () => {
          console.log('Sellers update');
          loadSellers();
          loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_challenges' },
        () => {
          console.log('Challenges update');
          loadChallenges();
        }
      )
      .subscribe();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadSalesData();
      loadSettings();
    }, 30000);
    
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
      
      // Calculate top sellers (month) with seller info
      const sellerTotals: { [key: string]: { amount: number, sellerId?: string } } = {};
      monthsSales.forEach((sale: Sale) => {
        if (!sellerTotals[sale.seller_name]) {
          sellerTotals[sale.seller_name] = { amount: 0, sellerId: sale.seller_id };
        }
        sellerTotals[sale.seller_name].amount += sale.amount;
      });
      
      const topSellersArray = Object.entries(sellerTotals)
        .map(([name, data]) => {
          const seller = sellers.find(s => s.id === data.sellerId || s.name === name);
          const goal = seller?.monthly_goal || 0;
          const progress = goal > 0 ? Math.round((data.amount / goal) * 100) : 0;
          
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url,
            goal,
            progress: Math.min(progress, 100)
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      setTopSellers(topSellersArray);
      
      // Calculate today's sales for chart and king/queen
      const todaysSellerTotals: { [key: string]: number } = {};
      todaysSales.forEach((sale: Sale) => {
        todaysSellerTotals[sale.seller_name] = (todaysSellerTotals[sale.seller_name] || 0) + sale.amount;
      });
      
      // Find today's king/queen if enabled
      if (settings.king_queen_enabled && Object.keys(todaysSellerTotals).length > 0) {
        const todaysBest = Object.entries(todaysSellerTotals)
          .sort((a, b) => b[1] - a[1])[0];
        if (todaysBest) {
          const seller = sellers.find(s => s.name === todaysBest[0]);
          setKingQueen({
            name: todaysBest[0],
            amount: todaysBest[1],
            imageUrl: seller?.profile_image_url
          });
        }
      }
      
      const todaysChartData = Object.entries(todaysSellerTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
      
      setChartData(todaysChartData);
      
      // Get last sale
      if (sales.length > 0) {
        setLastSale(sales[0]);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('dashboard_settings').select('*');
      if (error) throw error;
      
      const settingsObj: { [key: string]: any } = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSellers = async () => {
    try {
      const { data, error } = await supabase.from('sellers').select('*');
      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase.from('daily_challenges').select('*').eq('is_active', true);
      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Check for night mode
  const currentHour = new Date().getHours();
  const isNightTime = currentHour >= 18 || currentHour < 9;
  const shouldUseNightMode = settings.night_mode_enabled && isNightTime;

  return (
    <div className={`min-h-screen p-4 ${shouldUseNightMode ? 'bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50' : 'bg-gradient-to-br from-background via-accent/20 to-background'}`}>
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
                    <div className="flex items-center gap-4">
                      {(() => {
                        const seller = sellers.find(s => s.id === lastSale.seller_id || s.name === lastSale.seller_name);
                        return seller?.profile_image_url ? (
                          <img 
                            src={seller.profile_image_url} 
                            alt={lastSale.seller_name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-primary/20"
                          />
                        ) : null;
                      })()}
                      <div>
                        <p className="text-2xl font-bold text-primary mb-1">
                          {lastSale.seller_name}
                        </p>
                        <p className="text-lg text-muted-foreground">
                          {formatCurrency(lastSale.amount)}
                        </p>
                      </div>
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

        {/* Säljare cirklar */}
        {chartData.length > 0 && (
          <Card className="card-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Dagens försäljning per säljare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {chartData.map((data) => {
                  const seller = sellers.find(s => s.name === data.name);
                  return (
                    <div key={data.name} className="flex flex-col items-center space-y-3 animate-fade-in">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-4 border-primary/30 hover:scale-105 transition-transform duration-200">
                          {seller?.profile_image_url ? (
                            <img 
                              src={seller.profile_image_url} 
                              alt={data.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-primary">
                              {data.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground text-sm mb-1">
                          {data.name}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(data.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dagens Kung/Drottning */}
        {settings.king_queen_enabled && kingQueen && (
          <Card className="card-shadow border-0 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-1">
              <div className="bg-card rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    👑 Dagens Kung/Drottning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {kingQueen.imageUrl && (
                      <img 
                        src={kingQueen.imageUrl} 
                        alt={kingQueen.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400"
                      />
                    )}
                    <div>
                      <p className="text-2xl font-bold text-primary mb-1">
                        {kingQueen.name}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {formatCurrency(kingQueen.amount)} idag
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        )}

        {/* Aktiva utmaningar */}
        {settings.challenges_enabled && challenges.length > 0 && (
          <Card className="card-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                🎯 Dagens utmaning
              </CardTitle>
            </CardHeader>
            <CardContent>
              {challenges.map(challenge => (
                <div key={challenge.id} className="p-4 rounded-lg bg-accent/10">
                  <h3 className="text-lg font-bold text-primary mb-2">{challenge.title}</h3>
                  <p className="text-muted-foreground mb-2">{challenge.description}</p>
                  <p className="text-sm font-semibold text-primary">
                    Målbelopp: {formatCurrency(challenge.target_amount)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Topplista */}
        {(settings.show_top_list !== false) && (
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
                        {seller.imageUrl && (
                          <img 
                            src={seller.imageUrl} 
                            alt={seller.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                          />
                        )}
                       <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-foreground">
                              {seller.name}
                            </p>
                            {seller.imageUrl && (
                              <img 
                                src={seller.imageUrl} 
                                alt={seller.name}
                                className="w-8 h-8 rounded-full object-cover border border-primary/20"
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Säljare
                          </p>
                          {settings.goals_enabled && seller.goal > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Månadsmål: {formatCurrency(seller.goal)}</span>
                                <span>{seller.progress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    seller.progress >= 100 ? 'bg-green-500' : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(seller.progress, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(seller.amount)}
                        </p>
                        {seller.progress >= 100 && (
                          <span className="text-sm text-green-600 font-semibold">🎉 Mål uppnått!</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

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