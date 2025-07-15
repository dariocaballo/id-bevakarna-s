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
    loadInitialData();
    loadSettings();
    loadChallenges();
    
    // Försök aktivera AudioContext tidigt för att undvika browser-restriktioner
    const initAudio = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        console.log('🎵 AudioContext initialized:', audioContext.state);
      } catch (error) {
        console.log('🎵 AudioContext not available');
      }
    };
    
    // Aktivera audio på första user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Listen for real-time updates
    const salesChannel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          console.log('🔊 Sales update received:', payload);
          if (payload.eventType === 'INSERT') {
            const newSale = payload.new as Sale;
            setLastSale(newSale);
            
            // Hämta aktuell säljarlista för att säkerställa vi har rätt data
            const { data: currentSellers } = await supabase.from('sellers').select('*');
            const seller = currentSellers?.find(s => s.id === newSale.seller_id);
            
            console.log('🎵 Found seller:', seller?.name);
            console.log('🎵 Sound URL:', seller?.sound_file_url);
            console.log('🎵 Seller ID from sale:', newSale.seller_id);
            
            if (seller?.sound_file_url) {
              try {
                console.log('🎵 Attempting to play custom sound...');
                const audio = new Audio(seller.sound_file_url);
                audio.volume = 0.8; // Höj volymen
                audio.crossOrigin = 'anonymous'; // För CORS
                
                // Försök spela ljudet
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                  await playPromise;
                  console.log('✅ Successfully played custom sound for:', seller.name);
                } else {
                  throw new Error('Play promise undefined');
                }
              } catch (error) {
                console.error('❌ Error playing custom sound:', error);
                console.log('🔄 Falling back to default applause...');
                playApplauseSound(); // Fallback till standard
              }
            } else {
              console.log('🔄 No custom sound found, playing default applause');
              playApplauseSound();
            }
          }
          loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        async (payload) => {
          console.log('Sellers update:', payload);
          const sellersData = await loadSellers();
          await loadSalesData(sellersData); // Reload sales data when sellers change
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
      loadSalesData(); // Will fetch fresh sellers data
    }, 30000);
    
    return () => {
      supabase.removeChannel(salesChannel);
      clearInterval(interval);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []); // Ta bort sellers dependency för att undvika re-subscriptions

  // Load sellers first, then sales data to ensure proper image mapping
  const loadInitialData = async () => {
    const sellersData = await loadSellers();
    await loadSalesData(sellersData);
  };

  const loadSalesData = async (sellersData?: Seller[]) => {
    try {
      // Use provided sellers data or fetch fresh data
      let currentSellers = sellersData;
      if (!currentSellers) {
        const { data } = await supabase.from('sellers').select('*');
        currentSellers = data || [];
      }
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
          const seller = currentSellers.find(s => s.id === data.sellerId || s.name.toLowerCase() === name.toLowerCase());
          console.log('🖼️ TopSeller mapping:', { 
            name, 
            sellerId: data.sellerId, 
            found_seller: !!seller,
            image_url: seller?.profile_image_url,
            sellers_count: currentSellers.length
          });
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
          const seller = currentSellers.find(s => s.id === data.sellerId || s.name.toLowerCase() === name.toLowerCase());
          console.log('🖼️ TodaySeller mapping:', { 
            name, 
            sellerId: data.sellerId, 
            found_seller: !!seller,
            image_url: seller?.profile_image_url,
            sellers_count: currentSellers.length
          });
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

  const loadSellers = async (): Promise<Seller[]> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*');
      if (error) throw error;
      console.log('🖼️ Loaded sellers with images:', data?.map(s => ({ 
        name: s.name, 
        profile_image_url: s.profile_image_url,
        has_image: !!s.profile_image_url 
      })));
      setSellers(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading sellers:', error);
      return [];
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
    <div className={`h-screen overflow-hidden p-3 ${
      isNightTime() 
        ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 to-blue-100'
    }`}>
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header - Kompakt */}
        <div className="text-center mb-3 flex-shrink-0">
          <h1 className={`text-3xl font-bold mb-1 ${
            isNightTime() ? 'text-white' : 'text-blue-800'
          }`}>ID-Bevakarna</h1>
          <h2 className={`text-lg font-semibold ${
            isNightTime() ? 'text-slate-300' : 'text-blue-600'
          }`}>Sales Dashboard</h2>
        </div>

        {/* TV-Optimerad Layout - Flex Container */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          
          {/* Övre rad - Totaler + King/Queen (om aktiverad) */}
          <div className="flex gap-2 h-32">
            {/* Dagens Total */}
            <Card className="flex-1 shadow-md border-0 bg-white">
              <CardHeader className="pb-1">
                <CardTitle className="text-base text-slate-700 font-bold">DAGENS TOTALA TB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalToday)}</div>
                <p className="text-xs text-slate-500">Totalt idag</p>
              </CardContent>
            </Card>

            {/* Månadens Total */}
            <Card className="flex-1 shadow-md border-0 bg-white">
              <CardHeader className="pb-1">
                <CardTitle className="text-base text-slate-700 font-bold">MÅNADENS TOTALA TB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalMonth)}</div>
                <p className="text-xs text-slate-500">Totalt denna månad</p>
              </CardContent>
            </Card>

            {/* Dagens Kung/Drottning - Kompakt */}
            {settings.king_queen_enabled === 'true' && todaysSellers.length > 0 && (
              <Card className="flex-1 shadow-md border-0 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-slate-700 font-bold flex items-center justify-center gap-1">
                    <span className="text-lg">👑</span> Dagens Kung/Drottning
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden border-2 border-yellow-400">
                      {todaysSellers[0].imageUrl ? (
                        <img src={todaysSellers[0].imageUrl} alt={todaysSellers[0].name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-slate-800">{todaysSellers[0].name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{todaysSellers[0].name}</p>
                      <p className="text-xs font-bold text-yellow-600">{formatCurrency(todaysSellers[0].amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Huvud-innehåll - Grid som anpassar sig */}
          <div className={`flex-1 grid gap-2 ${
            // Dynamisk grid baserat på aktiva moduler
            activeChallenges.length > 0 && settings.challenges_enabled === 'true' 
              ? 'grid-cols-3' 
              : settings.goals_enabled === 'true' && sellers.filter(s => s.monthly_goal > 0).length > 0
                ? 'grid-cols-2'
                : 'grid-cols-1'
          }`}>
            
            {/* Dagens försäljning - Horisontell rangordning */}
            {todaysSellers.length > 0 && (
              <Card className="shadow-md border-0 bg-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-700 font-bold text-center">Dagens försäljning per säljare</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100%-60px)]">
                  <div className="flex flex-wrap justify-center gap-4 px-2">
                    {todaysSellers.map((seller, index) => (
                      <div key={seller.name} className="flex flex-col items-center space-y-2 min-w-[120px]">
                        {/* Platsering ovanför cirkel */}
                        <div className="flex items-center justify-center">
                          <span className="text-lg font-bold">{getMedalIcon(index)}</span>
                          <span className="text-sm font-bold text-slate-600 ml-1">#{index + 1}</span>
                        </div>
                        
                        {/* Stor cirkel med profilbild */}
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-3 border-blue-300 shadow-lg hover:scale-105 transition-transform duration-200">
                          {seller.imageUrl ? (
                            <>
                              {console.log(`📸 Rendering image for ${seller.name}:`, seller.imageUrl)}
                              <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-slate-800">{seller.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        
                        {/* Namn och belopp under cirkel */}
                        <div className="text-center">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{seller.name}</p>
                          <p className="text-base font-bold text-blue-700 leading-tight">{formatCurrency(seller.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mitten kolumn - Säljmål (om aktiverat) */}
            {settings.goals_enabled === 'true' && sellers.filter(s => s.monthly_goal > 0).length > 0 && (
              <Card className="shadow-md border-0 bg-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-700 font-bold text-center">Månadens säljmål</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100%-60px)]">
                  <div className="space-y-2">
                    {sellers.filter(seller => seller.monthly_goal > 0).map((seller) => {
                      const sellerMonthSales = topSellers.find(s => s.name === seller.name)?.amount || 0;
                      const progress = Math.min((sellerMonthSales / seller.monthly_goal) * 100, 100);
                      
                      return (
                        <div key={seller.id} className="p-2 rounded bg-blue-50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {seller.profile_image_url ? (
                                <img src={seller.profile_image_url} alt={seller.name} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                                  <span className="text-xs font-bold text-slate-800">{seller.name.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <span className="font-semibold text-slate-800 text-xs">{seller.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-600">{formatCurrency(sellerMonthSales)} / {formatCurrency(seller.monthly_goal)}</div>
                              <div className="text-xs text-slate-500">{progress.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ease-out ${
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

            {/* Höger kolumn - Utmaningar (om aktiverat) */}
            {activeChallenges.length > 0 && settings.challenges_enabled === 'true' && (
              <Card className="shadow-md border-0 bg-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-700 font-bold text-center">Dagliga utmaningar</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100%-60px)]">
                  <div className="space-y-2">
                    {activeChallenges.map((challenge) => (
                      <div key={challenge.id} className="p-2 rounded bg-yellow-50 border border-yellow-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-1">{challenge.title}</h4>
                        <p className="text-xs text-slate-600 mb-2">{challenge.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Mål:</span>
                          <span className="text-sm font-bold text-blue-700">{formatCurrency(challenge.target_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Månadens toppsäljare - Kompakt version */}
            {topSellers.length > 0 && (
              <Card className="shadow-md border-0 bg-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-700 font-bold text-center">Månadens toppsäljare</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100%-60px)]">
                  <div className="space-y-2">
                    {topSellers.slice(0, 5).map((seller, index) => (
                      <div key={seller.name} className="flex items-center justify-between p-2 rounded bg-blue-50">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getMedalIcon(index)}</span>
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden border border-blue-300">
                            {seller.imageUrl ? (
                              <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-black">{seller.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{seller.name}</p>
                            <p className="text-xs text-slate-500">#{index + 1}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-700">{formatCurrency(seller.amount)}</p>
                          <p className="text-xs text-slate-500">månaden</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;