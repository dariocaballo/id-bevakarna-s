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

  const loadSellers = useCallback(async (): Promise<Seller[]> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*').order('name');
      if (error) throw error;
      
      const sellersData = data || [];
      sellersCache.current = sellersData;
      
      if (isMountedRef.current) {
        setSellers(sellersData);
      }
      
      return sellersData;
    } catch (error) {
      return [];
    }
  }, []);

  const loadSalesData = useCallback(async (sellersData?: Seller[]) => {
    try {
      const currentSellers = sellersData || sellersCache.current;
      
      // Use server-side aggregation for better performance
      const [dailyResult, monthlyResult] = await Promise.all([
        supabase.rpc('get_daily_totals'),
        supabase.rpc('get_monthly_totals')
      ]);

      if (dailyResult.error) throw dailyResult.error;
      if (monthlyResult.error) throw monthlyResult.error;

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
      // Silent error - no console.log for production
      if (isMountedRef.current) {
        setTotalToday(0);
        setTotalMonth(0);
        setTopSellers([]);
        setTodaysSellers([]);
      }
    }
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    channelRef.current = supabase
      .channel('dashboard-realtime')
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync - keep connection alive
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
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
          
          // Refresh sales data efficiently
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
    const sellersData = await loadSellers();
    await loadSalesData(sellersData);
    setSettings({});
    setIsLoading(false);
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