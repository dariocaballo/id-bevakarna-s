import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getVersionedUrl } from '@/utils/media';
import { dataApi } from '@/utils/dataApi';

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

  // Refs for managing subscriptions and state
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const sellersCache = useRef<Seller[]>([]);
  const isReconnectingRef = useRef(false);
  const lastDataLoadRef = useRef<number>(0);

  // Robust seller loading with retry and exponential backoff
  const loadSellers = useCallback(async (retryCount = 0): Promise<Seller[]> => {
    try {
      const result = await dataApi<{ sellers: Seller[] }>('list_sellers');
      const sellersData = result.sellers || [];
      sellersCache.current = sellersData;
      
      if (isMountedRef.current) {
        setSellers(sellersData);
      }
      
      console.log(`✅ Loaded ${sellersData.length} sellers`);
      return sellersData;
    } catch (error) {
      console.error('Error loading sellers:', error);
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadSellers(retryCount + 1);
      }
      // Return cached data if available, otherwise empty array
      const fallback = sellersCache.current.length > 0 ? sellersCache.current : [];
      
      // Schedule background retry if initial load failed
      if (retryCount === 0 && isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            loadSellers(1);
          }
        }, 3000);
      }
      
      return fallback;
    }
  }, []);

  // Robust sales data loading with retry
  const loadSalesData = useCallback(async (sellersData?: Seller[], retryCount = 0) => {
    // Prevent too frequent reloads
    const now = Date.now();
    if (now - lastDataLoadRef.current < 500) {
      return;
    }
    lastDataLoadRef.current = now;

    try {
      const result = await dataApi<any>('dashboard_data');
      const currentSellers = sellersData || result.sellers || sellersCache.current;
      sellersCache.current = currentSellers;
      const versionImage = (seller: any) => ({
        ...seller,
        imageUrl: seller.imageUrl ? getVersionedUrl(seller.imageUrl, currentSellers.find((s: Seller) => s.id === seller.seller_id || s.name.toLowerCase() === seller.name.toLowerCase())?.updated_at) || seller.imageUrl : undefined
      });
      const todaysSellersArray = (result.todaysSellers || []).map(versionImage);
      const topSellersArray = (result.topSellers || []).map(versionImage);

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setSellers(currentSellers);
        setTotalToday(Number(result.totalToday) || 0);
        setTotalMonth(Number(result.totalMonth) || 0);
        setTopSellers(topSellersArray);
        setTodaysSellers(todaysSellersArray);
      }
      
      console.log('✅ Sales data loaded:', { 
        totalToday: result.totalToday, 
        totalMonth: result.totalMonth,
        todaysSellersCount: todaysSellersArray.length,
        topSellersCount: topSellersArray.length
      });
      
    } catch (error) {
      console.error('Error loading sales:', error);
      // Keep existing data - don't reset on errors
    }
  }, []);

  // Setup realtime subscription with robust reconnection
  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('🔌 Setting up realtime subscription...');

    channelRef.current = supabase
      .channel('dashboard-realtime-v2', {
        config: {
          presence: { key: 'dashboard' },
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        async (payload) => {
          if (!isMountedRef.current) return;
          
          console.log('📊 New sale received:', payload.new);
          const newSale = payload.new as Sale;
          
          // Find seller and trigger callback
          const seller = sellersCache.current.find(s => 
            s.id === newSale.seller_id || 
            s.name.toLowerCase() === newSale.seller_name.toLowerCase()
          );
          
          if (onNewSale) {
            onNewSale(newSale, seller);
          }
          
          // Refresh sales data
          await loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sales' },
        async () => {
          if (!isMountedRef.current) return;
          console.log('📊 Sale updated');
          await loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sales' },
        async () => {
          if (!isMountedRef.current) return;
          console.log('🗑️ Sale deleted');
          await loadSalesData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sellers' },
        async () => {
          if (!isMountedRef.current) return;
          console.log('👤 New seller added');
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          if (onSellerUpdate) {
            onSellerUpdate(sellersData);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sellers' },
        async () => {
          if (!isMountedRef.current) return;
          console.log('👤 Seller updated');
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          if (onSellerUpdate) {
            onSellerUpdate(sellersData);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sellers' },
        async () => {
          if (!isMountedRef.current) return;
          console.log('🗑️ Seller deleted');
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          if (onSellerUpdate) {
            onSellerUpdate(sellersData);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Realtime subscription status:', status, err || '');
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected');
          isReconnectingRef.current = false;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('⚠️ Realtime disconnected, will reconnect...');
          
          // Attempt reconnection after delay
          if (!isReconnectingRef.current && isMountedRef.current) {
            isReconnectingRef.current = true;
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 Attempting realtime reconnection...');
                setupRealtimeSubscription();
              }
            }, 3000);
          }
        }
      });

    // Heartbeat to keep connection alive
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current && isMountedRef.current) {
        channelRef.current.track({ 
          online_at: new Date().toISOString(),
          client: 'dashboard'
        }).catch(() => {
          // Presence tracking failed - connection might be lost
          console.log('⚠️ Heartbeat failed, checking connection...');
        });
      }
    }, 25000);

  }, [loadSalesData, loadSellers, onNewSale, onSellerUpdate]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      console.log('🔄 Refreshing all data...');
      const sellersData = await loadSellers();
      await loadSalesData(sellersData);
      setSettings({});
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      // Always set loading to false after first attempt
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadSellers, loadSalesData]);

  // Handle visibility change for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        console.log('👁️ Page visible - refreshing data');
        // Re-sync data when page becomes visible
        refreshData();
        
        // Check if realtime channel is still connected
        if (!channelRef.current || isReconnectingRef.current) {
          setupRealtimeSubscription();
        }
      }
    };

    // Also handle online/offline events
    const handleOnline = () => {
      if (isMountedRef.current) {
        console.log('🌐 Network online - refreshing...');
        refreshData();
        setupRealtimeSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshData, setupRealtimeSubscription]);

  // Initialize data and setup real-time subscriptions
  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('🚀 Initializing dashboard data...');
    
    // Initial data load
    refreshData();

    // Setup real-time subscription
    setupRealtimeSubscription();

    // Setup auto-refresh interval if enabled - for fallback
    if (enableAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (!document.hidden && isMountedRef.current) {
          loadSalesData();
        }
      }, Math.max(refreshInterval, 60000)); // Minimum 1 minute
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up dashboard subscriptions...');
      isMountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
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
