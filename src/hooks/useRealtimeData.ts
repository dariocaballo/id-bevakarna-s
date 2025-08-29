import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount_tb: number;
  timestamp: string;
}

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
}

interface UseRealtimeDataReturn {
  totalToday: number;
  totalMonth: number;
  topSellers: Array<{name: string, amount: number, imageUrl?: string}>;
  todaysSellers: Array<{name: string, amount: number, imageUrl?: string}>;
  sellers: Seller[];
  settings: { [key: string]: any };
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

interface UseRealtimeDataOptions {
  onNewSale?: (sale: Sale, seller?: Seller) => void;
  onSellerUpdate?: (sellers: Seller[]) => void;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
}

export const useRealtimeData = (options: UseRealtimeDataOptions = {}): UseRealtimeDataReturn => {
  const { onNewSale, onSellerUpdate, enableAutoRefresh = true, refreshInterval = 30000 } = options;
  
  // Data states
  const [totalToday, setTotalToday] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [topSellers, setTopSellers] = useState<Array<{name: string, amount: number, imageUrl?: string}>>([]);
  const [todaysSellers, setTodaysSellers] = useState<Array<{name: string, amount: number, imageUrl?: string}>>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Refs for managing subscriptions
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sellersCache = useRef<Seller[]>([]);

  const loadSellers = useCallback(async (): Promise<Seller[]> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('name');
      if (error) throw error;
      
      const sellersData = data || [];
      sellersCache.current = sellersData;
      
      if (isMountedRef.current) {
        setSellers(sellersData);
        console.log('📋 Loaded sellers:', sellersData.length, 'sellers');
      }
      
      return sellersData;
    } catch (error) {
      console.error('❌ Error loading sellers:', error);
      return [];
    }
  }, []);

  const loadSalesData = useCallback(async (sellersData?: Seller[]) => {
    try {
      const currentSellers = sellersData || sellersCache.current;
      
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
      
      // Filter sales by date ranges
      const todaysSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= today;
      });
      
      const monthsSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= monthStart;
      });
      
      // Calculate totals
      const todaysTotal = todaysSales.reduce((sum: number, sale: Sale) => sum + sale.amount_tb, 0);
      const monthsTotal = monthsSales.reduce((sum: number, sale: Sale) => sum + sale.amount_tb, 0);
      
      // Calculate seller rankings for the month
      const monthlySellerTotals: { [key: string]: { amount: number, sellerId?: string } } = {};
      monthsSales.forEach((sale: Sale) => {
        if (!monthlySellerTotals[sale.seller_name]) {
          monthlySellerTotals[sale.seller_name] = { amount: 0, sellerId: sale.seller_id };
        }
        monthlySellerTotals[sale.seller_name].amount += sale.amount_tb;
      });
      
      const topSellersArray = Object.entries(monthlySellerTotals)
        .map(([name, data]) => {
          const seller = currentSellers.find(s => s.id === data.sellerId || s.name.toLowerCase() === name.toLowerCase());
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
      
      // Calculate today's sellers
      const todaysSellerTotals: { [key: string]: { amount: number, sellerId?: string } } = {};
      todaysSales.forEach((sale: Sale) => {
        if (!todaysSellerTotals[sale.seller_name]) {
          todaysSellerTotals[sale.seller_name] = { amount: 0, sellerId: sale.seller_id };
        }
        todaysSellerTotals[sale.seller_name].amount += sale.amount_tb;
      });
      
      const todaysSellersArray = Object.entries(todaysSellerTotals)
        .map(([name, data]) => {
          const seller = currentSellers.find(s => s.id === data.sellerId || s.name.toLowerCase() === name.toLowerCase());
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url
          };
        })
        .sort((a, b) => b.amount - a.amount);

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setTotalToday(todaysTotal);
        setTotalMonth(monthsTotal);
        setTopSellers(topSellersArray);
        setTodaysSellers(todaysSellersArray);
      }
      
      console.log('📊 Sales data loaded:', {
        todaysTotal,
        monthsTotal,
        topSellersCount: topSellersArray.length,
        todaysSellersCount: todaysSellersArray.length
      });
    } catch (error) {
      console.error('❌ Error loading sales data:', error);
    }
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    console.log('🔄 Setting up real-time subscription...');
    
    channelRef.current = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          console.log('🔊 Sales update received:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && isMountedRef.current) {
            const newSale = payload.new as Sale;
            console.log('🎆 NEW SALE:', newSale.seller_name, newSale.amount_tb, 'tb');
            
            // Find seller and trigger callback
            const seller = sellersCache.current.find(s => 
              s.id === newSale.seller_id || 
              s.name.toLowerCase() === newSale.seller_name.toLowerCase()
            );
            
            if (onNewSale) {
              console.log('🎆 Triggering celebration!');
              onNewSale(newSale, seller);
            }
          }
          
          // Refresh sales data
          await loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        async (payload) => {
          console.log('👥 Sellers update received:', payload.eventType);
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          
          // Notify parent component about seller changes
          if (onSellerUpdate) {
            onSellerUpdate(sellersData);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });
  }, [loadSalesData, loadSellers, onNewSale, onSellerUpdate]);

  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing all data...');
    const sellersData = await loadSellers();
    await loadSalesData(sellersData);
    setSettings({}); // No settings implemented yet
    setIsLoading(false);
    console.log('✅ Data refresh complete');
  }, [loadSellers, loadSalesData]);

  // Initialize data and setup real-time subscriptions
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial data load
    refreshData();

    // Setup real-time subscription
    setupRealtimeSubscription();

    // Setup auto-refresh interval if enabled
    if (enableAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('⏰ Auto-refreshing data...');
        loadSalesData();
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions...');
      isMountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    sellers,
    settings,
    isLoading,
    refreshData
  };
};