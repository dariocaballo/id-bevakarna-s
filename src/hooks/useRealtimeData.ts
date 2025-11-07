import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getVersionedUrl } from '@/utils/media';

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
  updated_at?: string;
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

  const loadSellers = useCallback(async (retryCount = 0): Promise<Seller[]> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('name');
      if (error) {
        // Retry with exponential backoff for connection issues
        if (retryCount < 3 && (error.code === 'PGRST002' || error.message?.includes('schema cache'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSellers(retryCount + 1);
        }
        throw error;
      }
      
      const sellersData = data || [];
      sellersCache.current = sellersData;
      
      if (isMountedRef.current) {
        setSellers(sellersData);
      }
      
      return sellersData;
    } catch (error) {
      console.error('Error loading sellers:', error);
      // Return cached data if available, otherwise empty array
      return sellersCache.current.length > 0 ? sellersCache.current : [];
    }
  }, []);

  const loadSalesData = useCallback(async (sellersData?: Seller[], retryCount = 0) => {
    try {
      const currentSellers = sellersData || sellersCache.current;
      
      // Use server-side aggregation for better performance
      const [dailyResult, monthlyResult] = await Promise.all([
        supabase.rpc('get_daily_totals'),
        supabase.rpc('get_monthly_totals')
      ]);

      // Retry with exponential backoff for connection issues
      if (dailyResult.error) {
        if (retryCount < 3 && (dailyResult.error.code === 'PGRST002' || dailyResult.error.message?.includes('schema cache'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSalesData(sellersData, retryCount + 1);
        }
        throw dailyResult.error;
      }
      if (monthlyResult.error) {
        if (retryCount < 3 && (monthlyResult.error.code === 'PGRST002' || monthlyResult.error.message?.includes('schema cache'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSalesData(sellersData, retryCount + 1);
        }
        throw monthlyResult.error;
      }

      const dailyData = dailyResult.data?.[0];
      const monthlyData = monthlyResult.data?.[0];
      
      // Process today's sellers
      const todaysSellersArray = Array.isArray(dailyData?.seller_totals) 
        ? (dailyData.seller_totals as any[])
          .map((sellerData: any) => {
            const seller = currentSellers.find(s => 
              s.id === sellerData.seller_id || 
              s.name.toLowerCase() === sellerData.seller_name.toLowerCase()
            );
            return {
              name: sellerData.seller_name,
              amount: Number(sellerData.amount),
              imageUrl: seller?.profile_image_url ? 
                getVersionedUrl(seller.profile_image_url, seller.updated_at) || seller.profile_image_url 
                : undefined
            };
          })
          .sort((a: any, b: any) => b.amount - a.amount)
        : [];

      // Process monthly top sellers
      const topSellersArray = Array.isArray(monthlyData?.seller_totals)
        ? (monthlyData.seller_totals as any[])
          .map((sellerData: any) => {
            const seller = currentSellers.find(s => 
              s.id === sellerData.seller_id || 
              s.name.toLowerCase() === sellerData.seller_name.toLowerCase()
            );
            return {
              name: sellerData.seller_name,
              amount: Number(sellerData.amount),
              imageUrl: seller?.profile_image_url ? 
                getVersionedUrl(seller.profile_image_url, seller.updated_at) || seller.profile_image_url 
                : undefined
            };
          })
          .sort((a: any, b: any) => b.amount - a.amount)
          .slice(0, 10)
        : [];

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setTotalToday(Number(dailyData?.total_today) || 0);
        setTotalMonth(Number(monthlyData?.total_month) || 0);
        setTopSellers(topSellersArray);
        setTodaysSellers(todaysSellersArray);
      }
      
    } catch (error) {
      console.error('Error loading sales:', error);
      // Keep existing data if available, otherwise show zeros
      if (isMountedRef.current) {
        // Don't reset to zero if we already have data - keep it stable
        if (totalToday === 0 && totalMonth === 0) {
          setTotalToday(0);
          setTotalMonth(0);
          setTopSellers([]);
          setTodaysSellers([]);
        }
      }
    }
  }, [totalToday, totalMonth]);

  const setupRealtimeSubscription = useCallback(() => {
    channelRef.current = supabase
      .channel('dashboard-realtime')
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync - keep connection alive
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          if (payload.eventType === 'INSERT' && isMountedRef.current) {
            const newSale = payload.new as Sale;
            
            // Find seller and trigger callback
            const seller = sellersCache.current.find(s => 
              s.id === newSale.seller_id || 
              s.name.toLowerCase() === newSale.seller_name.toLowerCase()
            );
            
            if (onNewSale) {
              onNewSale(newSale, seller);
            }
          }
          
          // Refresh sales data efficiently for all events (INSERT, UPDATE, DELETE)
          await loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sellers' },
        async (payload) => {
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          
          if (onSellerUpdate) {
            onSellerUpdate(sellersData);
          }
        }
      )
      .subscribe();

    // Keep connection alive with heartbeat
    const heartbeatInterval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track({ last_seen: new Date().toISOString() });
      }
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [loadSalesData, loadSellers, onNewSale, onSellerUpdate]);

  const refreshData = useCallback(async () => {
    try {
      const sellersData = await loadSellers();
      await loadSalesData(sellersData);
      setSettings({});
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      // Always set loading to false after first attempt
      setIsLoading(false);
    }
  }, [loadSellers, loadSalesData]);

  // Handle visibility change for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        // Re-sync data when page becomes visible
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);

  // Initialize data and setup real-time subscriptions
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial data load
    refreshData();

    // Setup real-time subscription
    const cleanupHeartbeat = setupRealtimeSubscription();

    // Setup auto-refresh interval if enabled - reduced frequency
    if (enableAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (!document.hidden && isMountedRef.current) {
          loadSalesData();
        }
      }, Math.max(refreshInterval, 60000)); // Minimum 1 minute
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      if (cleanupHeartbeat) {
        cleanupHeartbeat();
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