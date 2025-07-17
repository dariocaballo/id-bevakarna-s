import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Crown, TrendingUp, Users, DollarSign, Clock, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSellerData } from '@/hooks/useSellerData';
import { useAudioManager } from '@/hooks/useAudioManager';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount: number;
  timestamp: string;
}

interface SalesData {
  todayTotal: number;
  monthTotal: number;
  dailySales: Array<{
    seller_name: string;
    seller_id?: string;
    total: number;
    profile_image_url?: string;
  }>;
  topSellers: Array<{
    seller_name: string;
    seller_id?: string;
    total: number;
    profile_image_url?: string;
  }>;
}

const Dashboard = () => {
  const [salesData, setSalesData] = useState<SalesData>({
    todayTotal: 0,
    monthTotal: 0,
    dailySales: [],
    topSellers: []
  });
  const [loading, setLoading] = useState(true);
  
  // Använd centrala hooks för seller-data och ljudhantering
  const { sellers, loading: sellersLoading, getSeller } = useSellerData();
  const { isInitialized: audioInitialized, preloadSellerAudio, playSellerSound } = useAudioManager();

  // Preladda ljud när sellers är redo
  useEffect(() => {
    if (sellers.length > 0 && !audioInitialized) {
      console.log('🎧 Initializing audio for', sellers.length, 'sellers');
      preloadSellerAudio(sellers);
    }
  }, [sellers, audioInitialized, preloadSellerAudio]);

  // Optimerad sales data loading med memoization
  const loadSalesData = useCallback(async () => {
    if (sellersLoading) {
      console.log('⏳ Waiting for sellers to load before fetching sales data');
      return;
    }

    try {
      console.log('📊 Loading sales data...');
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Parallell fetch för bättre prestanda
      const [todayResponse, monthResponse] = await Promise.all([
        supabase
          .from('sales')
          .select('*')
          .gte('timestamp', today.toISOString()),
        supabase
          .from('sales')
          .select('*')
          .gte('timestamp', startOfMonth.toISOString())
      ]);

      if (todayResponse.error) throw todayResponse.error;
      if (monthResponse.error) throw monthResponse.error;

      const todaySales = todayResponse.data || [];
      const monthSales = monthResponse.data || [];

      // Beräkna försäljningsdata med seller-info
      const todayTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
      const monthTotal = monthSales.reduce((sum, sale) => sum + sale.amount, 0);

      // Gruppera dagens försäljning per säljare
      const dailySalesMap = new Map<string, { seller_name: string; seller_id?: string; total: number; profile_image_url?: string }>();
      
      todaySales.forEach(sale => {
        const key = sale.seller_id || sale.seller_name;
        const seller = sale.seller_id ? getSeller(sale.seller_id) : getSeller(sale.seller_name);
        
        if (dailySalesMap.has(key)) {
          dailySalesMap.get(key)!.total += sale.amount;
        } else {
          dailySalesMap.set(key, {
            seller_name: sale.seller_name,
            seller_id: sale.seller_id,
            total: sale.amount,
            profile_image_url: seller?.profile_image_url
          });
        }
      });

      // Gruppera månadens försäljning för topplista
      const monthSalesMap = new Map<string, { seller_name: string; seller_id?: string; total: number; profile_image_url?: string }>();
      
      monthSales.forEach(sale => {
        const key = sale.seller_id || sale.seller_name;
        const seller = sale.seller_id ? getSeller(sale.seller_id) : getSeller(sale.seller_name);
        
        if (monthSalesMap.has(key)) {
          monthSalesMap.get(key)!.total += sale.amount;
        } else {
          monthSalesMap.set(key, {
            seller_name: sale.seller_name,
            seller_id: sale.seller_id,
            total: sale.amount,
            profile_image_url: seller?.profile_image_url
          });
        }
      });

      const dailySales = Array.from(dailySalesMap.values())
        .sort((a, b) => b.total - a.total);
      
      const topSellers = Array.from(monthSalesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setSalesData({
        todayTotal,
        monthTotal,
        dailySales,
        topSellers
      });

      console.log('✅ Sales data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  }, [sellersLoading, getSeller]);

  // Ladda data när sellers är redo
  useEffect(() => {
    if (!sellersLoading && sellers.length > 0) {
      loadSalesData();
    }
  }, [sellersLoading, loadSalesData]);

  // Setup realtime listener för sales
  useEffect(() => {
    console.log('📡 Setting up sales realtime listener');
    
    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          console.log('📡 Sales realtime update:', payload.eventType, payload.new || payload.old);
          
          // Vid ny försäljning, spela ljud
          if (payload.eventType === 'INSERT' && payload.new) {
            const newSale = payload.new as Sale;
            console.log('🎵 New sale detected:', newSale);
            
            // Hitta säljare och spela ljud
            const seller = newSale.seller_id ? getSeller(newSale.seller_id) : getSeller(newSale.seller_name);
            
            if (seller && audioInitialized) {
              const success = await playSellerSound(seller.id, seller.name);
              if (!success) {
                console.log(`❌ Could not play sound for ${seller.name}`);
              }
            } else {
              console.log('❌ Seller not found or audio not initialized:', {
                seller_id: newSale.seller_id,
                seller_name: newSale.seller_name,
                audioInitialized
              });
            }
          }
          
          // Uppdatera sales data
          loadSalesData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Sales realtime status:', status);
      });

    return () => {
      console.log('📡 Cleaning up sales realtime listener');
      supabase.removeChannel(channel);
    };
  }, [loadSalesData, getSeller, audioInitialized, playSellerSound]);

  // Memoized components för bättre prestanda
  const todaysLeader = useMemo(() => {
    return salesData.dailySales.length > 0 ? salesData.dailySales[0] : null;
  }, [salesData.dailySales]);

  const renderSellerAvatar = useCallback((seller: { seller_name: string; profile_image_url?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12', 
      lg: 'w-16 h-16'
    };

    const fallbackClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-lg'
    };

    return (
      <Avatar className={sizeClasses[size]}>
        <AvatarImage 
          src={seller.profile_image_url} 
          alt={seller.seller_name}
          onError={(e) => {
            console.log(`📷 Image failed for ${seller.seller_name}:`, seller.profile_image_url);
            e.currentTarget.style.display = 'none';
          }}
        />
        <AvatarFallback className={`bg-primary text-primary-foreground ${fallbackClasses[size]}`}>
          {seller.seller_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' tb';
  }, []);

  if (loading || sellersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-primary">Laddar dashboard...</p>
            <p className="text-sm text-muted-foreground">
              {sellersLoading ? 'Laddar säljare...' : 'Laddar försäljningsdata...'}
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header med logo och titel */}
        <div className="text-center mb-8 space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-white p-3 card-shadow hover-scale">
            <img 
              src="/lovable-uploads/a4efd036-dc1e-420a-8621-0fe448423e2f.png" 
              alt="ID-Bevakarna" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">ID-Bevakarna</h1>
            <p className="text-lg text-muted-foreground">Sales Dashboard v2.0</p>
          </div>
        </div>

        {/* Statistikkort */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="card-shadow border-0 hover-scale">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(salesData.todayTotal)}</p>
                  <p className="text-sm text-muted-foreground">Idag</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 hover-scale">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-8 h-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">{formatCurrency(salesData.monthTotal)}</p>
                  <p className="text-sm text-muted-foreground">Denna månad</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 hover-scale">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-info" />
                <div>
                  <p className="text-2xl font-bold text-info">{salesData.dailySales.length}</p>
                  <p className="text-sm text-muted-foreground">Aktiva säljare idag</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 hover-scale">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-muted-foreground">Aktuell tid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kung/Drottning av dagen */}
        {todaysLeader && (
          <Card className="card-shadow border-0 mb-8 hero-gradient text-white overflow-hidden">
            <CardContent className="p-8 text-center relative">
              <div className="absolute top-4 right-4">
                <Crown className="w-12 h-12 text-yellow-300 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-300" />
                  Dagens Kung/Drottning
                </h2>
                <div className="flex items-center justify-center space-x-6">
                  {renderSellerAvatar(todaysLeader, 'lg')}
                  <div className="text-left">
                    <p className="text-2xl font-bold">{todaysLeader.seller_name}</p>
                    <p className="text-xl text-yellow-100">{formatCurrency(todaysLeader.total)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Huvudlayout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dagens försäljning - Cirkelvy */}
          <Card className="card-shadow border-0 hover-scale">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-primary flex items-center justify-center gap-2">
                <DollarSign className="w-6 h-6" />
                Dagens försäljning
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.dailySales.length > 0 ? (
                <div className="relative h-80 flex items-center justify-center">
                  {salesData.dailySales.map((seller, index) => {
                    const angle = (index / salesData.dailySales.length) * 2 * Math.PI;
                    const radius = 120;
                    const x = Math.cos(angle) * radius + 150;
                    const y = Math.sin(angle) * radius + 150;
                    
                    return (
                      <div
                        key={seller.seller_id || seller.seller_name}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 hover-scale"
                        style={{ left: x, top: y }}
                      >
                        <div className="text-center space-y-2">
                          <div className="relative">
                            {renderSellerAvatar(seller, 'md')}
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 card-shadow min-w-[100px]">
                            <p className="font-semibold text-sm text-center text-primary">
                              {seller.seller_name}
                            </p>
                            <p className="text-xs text-center text-muted-foreground">
                              {formatCurrency(seller.total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Ingen försäljning registrerad idag</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Månadens topplista */}
          <Card className="card-shadow border-0 hover-scale">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-primary flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6" />
                Månadens topplista
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.topSellers.length > 0 ? (
                <div className="space-y-4">
                  {salesData.topSellers.map((seller, index) => (
                    <div 
                      key={seller.seller_id || seller.seller_name} 
                      className="flex items-center justify-between p-4 rounded-lg bg-accent/10 hover:bg-accent/20 smooth-transition hover-scale"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {renderSellerAvatar(seller, 'sm')}
                          <Badge 
                            variant={index === 0 ? "default" : "secondary"} 
                            className={`absolute -top-1 -right-1 text-xs ${
                              index === 0 ? 'bg-yellow-500 text-white' : ''
                            }`}
                          >
                            {index + 1}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{seller.seller_name}</p>
                          <p className="text-sm text-muted-foreground">Månadstotal</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">{formatCurrency(seller.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Ingen försäljning registrerad denna månad</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer med navigation */}
        <div className="text-center mt-12 space-y-4">
          <div className="flex justify-center space-x-6">
            <a 
              href="/seller" 
              className="story-link text-primary hover:text-primary-glow font-medium smooth-transition"
            >
              Rapportera försäljning →
            </a>
            <a 
              href="/admin" 
              className="story-link text-primary hover:text-primary-glow font-medium smooth-transition"
            >
              Adminpanel →
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            ID-Bevakarna Säljsystem v2.0 - Optimerat för prestanda
          </p>
          {!audioInitialized && (
            <p className="text-xs text-warning">
              🎧 Ljudsystem initieras...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;