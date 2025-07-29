import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount: number;
  timestamp: string;
  service_type?: string;
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

interface UseRealtimeDataReturn {
  // Data states
  totalToday: number;
  totalMonth: number;
  topSellers: Array<{name: string, amount: number, imageUrl?: string}>;
  todaysSellers: Array<{name: string, amount: number, imageUrl?: string}>;
  lastSale: Sale | null;
  sellers: Seller[];
  activeChallenges: DailyChallenge[];
  settings: { [key: string]: any };
  
  // Loading states
  isLoading: boolean;
  
  // Methods
  refreshData: () => Promise<void>;
  onNewSale?: (sale: Sale, seller?: Seller) => void;
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
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<DailyChallenge[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Refs for managing subscriptions and preventing memory leaks
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10; // Increased for better resilience
  const connectionStableRef = useRef(true);
  const lastDataUpdateRef = useRef<number>(Date.now());

  // Cache ref for sellers to avoid unnecessary re-fetches
  const sellersCache = useRef<Seller[]>([]);

  const loadSellers = useCallback(async (): Promise<Seller[]> => {
    try {
      const { data, error } = await supabase.from('sellers').select('*');
      if (error) throw error;
      
      const sellersData = data || [];
      sellersCache.current = sellersData;
      
      if (isMountedRef.current) {
        setSellers(sellersData);
        console.log('🖼️ Loaded sellers with images:', sellersData.map(s => ({ 
          name: s.name, 
          profile_image_url: s.profile_image_url,
          has_image: !!s.profile_image_url 
        })));
      }
      
      return sellersData;
    } catch (error) {
      console.error('❌ Error loading sellers:', error);
      return [];
    }
  }, []);

  const loadSalesData = useCallback(async (sellersData?: Seller[]) => {
    try {
      // Use provided sellers data or cache
      const currentSellers = sellersData || sellersCache.current;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get all sales efficiently
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
      const todaysTotal = todaysSales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
      const monthsTotal = monthsSales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0);
      
      // Calculate seller rankings
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
          return {
            name,
            amount: data.amount,
            imageUrl: seller?.profile_image_url
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      // Calculate today's sellers
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
        
        if (sales.length > 0) {
          setLastSale(sales[0]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading sales data:', error);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('dashboard_settings').select('*');
      if (error) throw error;
      
      const settingsObj: { [key: string]: any } = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      if (isMountedRef.current) {
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      
      if (isMountedRef.current) {
        setActiveChallenges(data || []);
      }
    } catch (error) {
      console.error('❌ Error loading challenges:', error);
    }
  }, []);

  // Enhanced watchdog function for 24/7 operation
  const checkConnectionHealth = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
    const timeSinceLastDataUpdate = now - lastDataUpdateRef.current;
    
    console.log('🔍 Enhanced connection health check:', {
      timeSinceLastHeartbeat: `${timeSinceLastHeartbeat}ms`,
      timeSinceLastDataUpdate: `${timeSinceLastDataUpdate}ms`,
      connectionStable: connectionStableRef.current,
      reconnectAttempts: reconnectAttemptsRef.current
    });
    
    // Multiple checks for different scenarios
    const isStaleConnection = timeSinceLastHeartbeat > 90000; // 1.5 minutes
    const isDataStale = timeSinceLastDataUpdate > 300000; // 5 minutes without any data updates
    const isConnectionUnstable = !connectionStableRef.current;
    
    if (isStaleConnection || isDataStale || isConnectionUnstable) {
      console.warn('⚠️ Connection health issues detected, initiating recovery...', {
        staleConnection: isStaleConnection,
        staleData: isDataStale,
        unstable: isConnectionUnstable
      });
      reconnectRealtime();
    } else {
      console.log('✅ Connection health check passed');
    }
  }, []);

  // Enhanced reconnect with exponential backoff
  const reconnectRealtime = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached, will retry in 60 seconds...');
      
      // Reset attempts after extended wait for long-term resilience
      setTimeout(() => {
        console.log('🔄 Resetting reconnection attempts after extended wait');
        reconnectAttemptsRef.current = 0;
        reconnectRealtime();
      }, 60000);
      return;
    }

    reconnectAttemptsRef.current++;
    const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Max 30 seconds
    
    console.log(`🔄 Reconnecting realtime subscription (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) after ${backoffDelay}ms delay`);

    setTimeout(() => {
      // Clean up existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Reset connection state
      connectionStableRef.current = false;
      lastHeartbeatRef.current = Date.now();
      lastDataUpdateRef.current = Date.now();

      // Setup new subscription
      setupRealtimeSubscription();
    }, backoffDelay);
  }, []);

  // Enhanced realtime subscription setup for 24/7 operation
  const setupRealtimeSubscription = useCallback(() => {
    console.log('🔄 Setting up enhanced real-time subscription for 24/7 operation...');
    
    channelRef.current = supabase
      .channel('dashboard-realtime', {
        config: {
          presence: { key: 'dashboard' },
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        async (payload) => {
          lastHeartbeatRef.current = Date.now();
          lastDataUpdateRef.current = Date.now();
          reconnectAttemptsRef.current = 0; // Reset on successful message
          connectionStableRef.current = true;
          
          console.log('🔊 Sales update received:', payload.eventType, 'at', new Date().toISOString());
          
          if (payload.eventType === 'INSERT' && isMountedRef.current) {
            const newSale = payload.new as Sale;
            console.log('🎆 NEW SALE REALTIME UPDATE:', {
              seller: newSale.seller_name,
              amount: newSale.amount,
              timestamp: newSale.timestamp,
              id: newSale.id
            });
            
            setLastSale(newSale);
            
            // Find seller and trigger callback
            const seller = sellersCache.current.find(s => 
              s.id === newSale.seller_id || 
              s.name.toLowerCase() === newSale.seller_name.toLowerCase()
            );
            
            console.log('🔍 Seller lookup result:', {
              found: !!seller,
              searchedId: newSale.seller_id,
              searchedName: newSale.seller_name,
              availableSellers: sellersCache.current.map(s => ({ id: s.id, name: s.name }))
            });
            
            if (onNewSale) {
              console.log('🎆 CALLING onNewSale callback - DASHBOARD SHOULD CELEBRATE NOW!');
              onNewSale(newSale, seller);
            } else {
              console.error('❌ NO onNewSale callback provided - CELEBRATIONS WILL NOT WORK!');
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
          lastHeartbeatRef.current = Date.now();
          lastDataUpdateRef.current = Date.now();
          reconnectAttemptsRef.current = 0; // Reset on successful message
          connectionStableRef.current = true;
          
          console.log('👥 Sellers update received:', payload.eventType, 'at', new Date().toISOString());
          const sellersData = await loadSellers();
          await loadSalesData(sellersData);
          
          // Notify parent component about seller changes for audio reloading
          if (onSellerUpdate && payload.eventType === 'UPDATE') {
            onSellerUpdate(sellersData);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_settings' },
        () => {
          lastHeartbeatRef.current = Date.now();
          lastDataUpdateRef.current = Date.now();
          reconnectAttemptsRef.current = 0; // Reset on successful message
          connectionStableRef.current = true;
          
          console.log('⚙️ Settings update received at', new Date().toISOString());
          loadSettings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_challenges' },
        () => {
          lastHeartbeatRef.current = Date.now();
          lastDataUpdateRef.current = Date.now();
          reconnectAttemptsRef.current = 0; // Reset on successful message
          connectionStableRef.current = true;
          
          console.log('🎯 Challenges update received at', new Date().toISOString());
          loadChallenges();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status, 'at', new Date().toISOString());
        
        if (status === 'SUBSCRIBED') {
          lastHeartbeatRef.current = Date.now();
          lastDataUpdateRef.current = Date.now();
          reconnectAttemptsRef.current = 0;
          connectionStableRef.current = true;
          console.log('✅ Successfully subscribed to realtime updates for 24/7 operation');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connectionStableRef.current = false;
          console.error('❌ Realtime subscription error:', status, 'will attempt reconnection');
          setTimeout(reconnectRealtime, 2000); // Quick retry for immediate issues
        }
      });
  }, [loadSalesData, loadSellers, loadSettings, loadChallenges, onNewSale, onSellerUpdate, reconnectRealtime]);

  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing all data...');
    const sellersData = await loadSellers();
    await Promise.all([
      loadSalesData(sellersData),
      loadSettings(),
      loadChallenges()
    ]);
    setIsLoading(false);
    console.log('✅ Data refresh complete');
  }, [loadSellers, loadSalesData, loadSettings, loadChallenges]);

  // Initialize data and setup real-time subscriptions
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial data load
    refreshData();

    // Setup real-time subscription
    setupRealtimeSubscription();

    // Setup auto-refresh interval with shorter intervals for critical updates
    if (enableAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('⏰ Auto-refreshing data for 24/7 stability...');
        lastDataUpdateRef.current = Date.now();
        loadSalesData();
      }, Math.min(refreshInterval, 15000)); // Max 15 seconds for TV displays
    }

    // Setup enhanced watchdog timer - check every 45 seconds for 24/7 operation
    watchdogIntervalRef.current = setInterval(checkConnectionHealth, 45000);

    // Enhanced heartbeat for 24/7 operation - every 20 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current && connectionStableRef.current) {
        console.log('💓 Sending heartbeat to maintain 24/7 connection...');
        // Send a broadcast to keep connection alive
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { 
            timestamp: Date.now(),
            dashboard_id: 'main',
            uptime: Date.now() - lastDataUpdateRef.current
          }
        });
      }
    }, 20000); // More frequent heartbeat for TV displays

    // Additional stability check every 5 minutes for aggressive long-term operation
    stabilityCheckIntervalRef.current = setInterval(() => {
      console.log('🛡️ Performing deep stability check for 24/7 operation...');
      
      // Force refresh if no updates in last 15 minutes (reduced from 30)
      const timeSinceLastUpdate = Date.now() - lastDataUpdateRef.current;
      if (timeSinceLastUpdate > 15 * 60 * 1000) {
        console.warn('⚠️ No updates for 15 minutes, forcing aggressive refresh...');
        // Force reconnect and refresh
        reconnectRealtime();
        setTimeout(() => refreshData(), 2000);
      }
      
      // Check if subscription is still active with more detailed logging
      if (!channelRef.current) {
        console.warn('⚠️ No channel reference, reconnecting...');
        reconnectRealtime();
      } else if (channelRef.current.state !== 'joined') {
        console.warn(`⚠️ Subscription not in joined state (current: ${channelRef.current.state}), reconnecting...`);
        reconnectRealtime();
      } else {
        console.log('✅ WebSocket channel healthy:', channelRef.current.state);
        
        // Send test broadcast to verify connection
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'stability_test',
            payload: { timestamp: Date.now() }
          });
          console.log('✅ Stability test broadcast sent successfully');
        } catch (error) {
          console.warn('⚠️ Stability test broadcast failed:', error);
          reconnectRealtime();
        }
      }
    }, 5 * 60 * 1000); // More frequent checks every 5 minutes

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions...');
      isMountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (stabilityCheckIntervalRef.current) {
        clearInterval(stabilityCheckIntervalRef.current);
        stabilityCheckIntervalRef.current = null;
      }
    };
  }, [refreshData, setupRealtimeSubscription, checkConnectionHealth, enableAutoRefresh, refreshInterval, loadSalesData]);

  return {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    lastSale,
    sellers,
    activeChallenges,
    settings,
    isLoading,
    refreshData
  };
};