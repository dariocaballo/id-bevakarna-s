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
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

interface UseRealtimeDataOptions {
  onNewSale?: (sale: Sale, seller?: Seller) => void;
}

export const useRealtimeData = (options: UseRealtimeDataOptions = {}): UseRealtimeDataReturn => {
  const { onNewSale } = options;
  
  const [totalToday, setTotalToday] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [topSellers, setTopSellers] = useState<Array<{name: string, amount: number, imageUrl?: string}>>([]);
  const [todaysSellers, setTodaysSellers] = useState<Array<{name: string, amount: number, imageUrl?: string}>>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
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
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data: allSales, error } = await supabase
        .from('sales')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const sales = allSales || [];
      
      const todaysSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= today;
      });
      
      const monthsSales = sales.filter((sale: Sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= monthStart;
      });
      
      const todaysTotal = todaysSales.reduce((sum: number, sale: Sale) => sum + sale.amount_tb, 0);
      const monthsTotal = monthsSales.reduce((sum: number, sale: Sale) => sum + sale.amount_tb, 0);
      
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

      if (isMountedRef.current) {
        setTotalToday(todaysTotal);
        setTotalMonth(monthsTotal);
        setTopSellers(topSellersArray);
        setTodaysSellers(todaysSellersArray);
      }
    } catch (error) {
      // Silent error handling
    }
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    channelRef.current = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, async (payload) => {
        if (payload.eventType === 'INSERT' && isMountedRef.current) {
          const newSale = payload.new as Sale;
          
          const seller = sellersCache.current.find(s => 
            s.id === newSale.seller_id || 
            s.name.toLowerCase() === newSale.seller_name.toLowerCase()
          );
          
          if (onNewSale) {
            onNewSale(newSale, seller);
          }
        }
        
        await loadSalesData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sellers' }, async () => {
        const sellersData = await loadSellers();
        await loadSalesData(sellersData);
      })
      .subscribe();
  }, [loadSalesData, loadSellers, onNewSale]);

  const refreshData = useCallback(async () => {
    const sellersData = await loadSellers();
    await loadSalesData(sellersData);
    setIsLoading(false);
  }, [loadSellers, loadSalesData]);

  useEffect(() => {
    isMountedRef.current = true;
    
    refreshData();
    setupRealtimeSubscription();

    return () => {
      isMountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [refreshData, setupRealtimeSubscription]);

  return {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    sellers,
    isLoading,
    refreshData
  };
};