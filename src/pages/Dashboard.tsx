import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  is_active: boolean;
}

const Dashboard = () => {
  const [totalToday, setTotalToday] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [topSellers, setTopSellers] = useState<{name: string, amount: number, imageUrl?: string}[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [todaysSellers, setTodaysSellers] = useState<{name: string, amount: number, imageUrl?: string}[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: any }>({});
  const [activeChallenges, setActiveChallenges] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    loadSalesData();
    loadSellers();
    loadSettings();
    loadChallenges();
    
    // Listen for real-time updates
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
            if (seller?.sound_file_url) {
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
        { event: '*', schema: 'public', table: 'sellers' },
        () => {
          console.log('Sellers update');
          loadSellers();
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
    }, 30000);
    
    return () => {
      supabase.removeChannel(salesChannel);
      clearInterval(interval);
    };
  }, [sellers]);

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
      const monthlySellerTotals: { [key: string]: { amount: number, sellerId?: string } } = {};
      monthsSales.forEach((sale: Sale) => {
        if (!monthlySellerTotals[sale.seller_name]) {
          monthlySellerTotals[sale.seller_name] = { amount: 0, sellerId: sale.seller_id };
        }
        monthlySellerTotals[sale.seller_name].amount += sale.amount;
      });
      
      const topSellersArray = Object.entries(monthlySellerTotals)
        .map(([name, data]) => {
          const seller = sellers.find(s => s.id === data.sellerId || s.name === name);
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      setTopSellers(topSellersArray);
      
      // Calculate today's sales per seller for circles
      const todaysSellerTotals: { [key: string]: { amount: number, sellerId?: string } } = {};
      todaysSales.forEach((sale: Sale) => {
        if (!todaysSellerTotals[sale.seller_name]) {
          todaysSellerTotals[sale.seller_name] = { amount: 0, sellerId: sale.seller_id };
        }
        todaysSellerTotals[sale.seller_name].amount += sale.amount;
      });
      
      const todaysSellersArray = Object.entries(todaysSellerTotals)
        .map(([name, data]) => {
          const seller = sellers.find(s => s.id === data.sellerId || s.name === name);
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url
          };
        })
        .sort((a, b) => b.amount - a.amount);
      
      setTodaysSellers(todaysSellersArray);
      
      // Get last sale
      if (sales.length > 0) {
        setLastSale(sales[0]);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
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

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      setActiveChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' TB';
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      case 3: return '🏅';
      case 4: return '🏅';
      default: return '';
    }
  };

  // Check if night mode is active
  const isNightTime = () => {
    const now = new Date();
    const hour = now.getHours();
    return settings.night_mode_enabled === 'true' && (hour >= 18 || hour <= 9);
  };

  return (
    <div className={`min-h-screen p-4 ${
      isNightTime() 
        ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 to-blue-100'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className={`text-5xl font-bold mb-2 ${
            isNightTime() ? 'text-white' : 'text-blue-800'
          }`}>ID-Bevakarna</h1>
          <h2 className={`text-2xl font-semibold ${
            isNightTime() ? 'text-slate-300' : 'text-blue-600'
          }`}>Sales Dashboard</h2>
        </div>

        {/* Dagens och Månadens totala TB */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-700 font-bold">
                DAGENS TOTALA TB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-700 mb-1">
                {formatCurrency(totalToday)}
              </div>
              <p className="text-sm text-slate-500">
                Totalt idag
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-700 font-bold">
                MÅNADENS TOTALA TB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-700 mb-1">
                {formatCurrency(totalMonth)}
              </div>
              <p className="text-sm text-slate-500">
                Totalt denna månad
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dagens försäljning per säljare - Cirklar */}
        {todaysSellers.length > 0 && (
          <Card className="shadow-lg border-0 bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-slate-700 font-bold text-center">
                Dagens försäljning per säljare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-8">
                {todaysSellers.map((seller, index) => (
                  <div key={seller.name} className="flex flex-col items-center space-y-3 animate-fade-in">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-300 hover:scale-105 transition-transform duration-200 shadow-lg">
                        {seller.imageUrl ? (
                          <img 
                            src={seller.imageUrl} 
                            alt={seller.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-black">
                            {seller.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                     <div className="text-center">
                       <div className="flex items-center justify-center mb-1">
                         <span className="text-2xl mr-1">{getMedalIcon(index)}</span>
                         <p className="font-semibold text-slate-800 text-sm">
                           {seller.name}
                         </p>
                       </div>
                       <p className="text-lg font-bold text-blue-700">
                         {formatCurrency(seller.amount)}
                       </p>
                     </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
         )}

         {/* Aktiva utmaningar */}
         {activeChallenges.length > 0 && settings.challenges_enabled === 'true' && (
           <Card className="shadow-lg border-0 bg-white mb-6">
             <CardHeader>
               <CardTitle className="text-xl text-slate-700 font-bold text-center">
                 Dagliga utmaningar
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {activeChallenges.map((challenge) => (
                   <div key={challenge.id} className="p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200">
                     <h3 className="text-lg font-bold text-slate-800 mb-2">{challenge.title}</h3>
                     <p className="text-slate-600 mb-3">{challenge.description}</p>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-500">Målbelopp:</span>
                       <span className="text-lg font-bold text-blue-700">{formatCurrency(challenge.target_amount)}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}

         {/* Dagens Kung/Drottning */}
         {settings.king_queen_enabled === 'true' && todaysSellers.length > 0 && (
           <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 mb-6">
             <CardHeader>
               <CardTitle className="text-xl text-slate-700 font-bold text-center flex items-center justify-center gap-2">
                 <span className="text-2xl">👑</span>
                 Dagens Kung/Drottning
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="flex items-center justify-center">
                 <div className="flex flex-col items-center space-y-3">
                   <div className="relative">
                     <div className="w-32 h-32 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden border-4 border-yellow-400 shadow-lg">
                       {todaysSellers[0].imageUrl ? (
                         <img 
                           src={todaysSellers[0].imageUrl} 
                           alt={todaysSellers[0].name}
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <span className="text-4xl font-bold text-slate-800">
                           {todaysSellers[0].name.charAt(0).toUpperCase()}
                         </span>
                       )}
                     </div>
                     <div className="absolute -top-2 -right-2 text-4xl">👑</div>
                   </div>
                   <div className="text-center">
                     <h3 className="text-2xl font-bold text-slate-800 mb-1">{todaysSellers[0].name}</h3>
                     <p className="text-xl font-bold text-yellow-600">
                       {formatCurrency(todaysSellers[0].amount)}
                     </p>
                     <p className="text-sm text-slate-600 mt-1">Dagens bästa försäljare</p>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}

         {/* Säljmål progressbars */}
         {settings.goals_enabled === 'true' && sellers.filter(s => s.monthly_goal > 0).length > 0 && (
           <Card className="shadow-lg border-0 bg-white mb-6">
             <CardHeader>
               <CardTitle className="text-xl text-slate-700 font-bold text-center">
                 Månadens säljmål
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {sellers.filter(seller => seller.monthly_goal > 0).map((seller) => {
                   const sellerMonthSales = topSellers.find(s => s.name === seller.name)?.amount || 0;
                   const progress = Math.min((sellerMonthSales / seller.monthly_goal) * 100, 100);
                   
                   return (
                     <div key={seller.id} className="p-4 rounded-lg bg-blue-50">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                           {seller.profile_image_url ? (
                             <img 
                               src={seller.profile_image_url} 
                               alt={seller.name}
                               className="w-8 h-8 rounded-full object-cover"
                             />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
                               <span className="text-sm font-bold text-slate-800">
                                 {seller.name.charAt(0).toUpperCase()}
                               </span>
                             </div>
                           )}
                           <span className="font-semibold text-slate-800">{seller.name}</span>
                         </div>
                         <div className="text-right">
                           <div className="text-sm text-slate-600">
                             {formatCurrency(sellerMonthSales)} / {formatCurrency(seller.monthly_goal)}
                           </div>
                           <div className="text-xs text-slate-500">
                             {progress.toFixed(1)}% av målet
                           </div>
                         </div>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-3">
                         <div 
                           className={`h-3 rounded-full transition-all duration-500 ease-out ${
                             progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                           }`}
                           style={{ width: `${progress}%` }}
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </CardContent>
           </Card>
         )}

        

        {/* Månadens toppsäljare */}
        {topSellers.length > 0 && (
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-slate-700 font-bold text-center">
                Månadens toppsäljare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSellers.map((seller, index) => (
                  <div key={seller.name} className="flex items-center justify-between p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {getMedalIcon(index)}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden border-2 border-blue-300">
                        {seller.imageUrl ? (
                          <img 
                            src={seller.imageUrl} 
                            alt={seller.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                           <span className="text-lg font-bold text-black">
                             {seller.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                         <p className="font-semibold text-slate-800 text-lg">
                           {seller.name}
                        </p>
                         <p className="text-sm text-slate-500">
                          Position #{index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(seller.amount)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Total TB denna månad
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;