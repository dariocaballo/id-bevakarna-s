import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
  monthly_goal: number;
}

// Global cache för sellers
let sellersCache: Seller[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuter

export const useSellerData = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Hämta sellers med cache
  const loadSellers = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      // Använd cache om den är giltig och inte force refresh
      if (!forceRefresh && sellersCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Using cached sellers data');
        setSellers(sellersCache);
        setLoading(false);
        return sellersCache;
      }

      console.log('🔄 Loading fresh sellers data');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sellers')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;

      const sellersData = data || [];
      
      // Uppdatera cache
      sellersCache = sellersData;
      cacheTimestamp = now;
      
      setSellers(sellersData);
      console.log(`✅ Loaded ${sellersData.length} sellers`);
      
      return sellersData;
    } catch (err) {
      console.error('❌ Error loading sellers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sellers');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Hitta säljare efter ID
  const findSellerById = useCallback((id: string): Seller | undefined => {
    return sellers.find(s => s.id === id);
  }, [sellers]);

  // Hitta säljare efter namn (case-insensitive)
  const findSellerByName = useCallback((name: string): Seller | undefined => {
    return sellers.find(s => s.name.toLowerCase() === name.toLowerCase());
  }, [sellers]);

  // Få säljare efter ID eller namn
  const getSeller = useCallback((idOrName: string): Seller | undefined => {
    return findSellerById(idOrName) || findSellerByName(idOrName);
  }, [findSellerById, findSellerByName]);

  // Uppdatera en säljare i cache
  const updateSellerInCache = useCallback((updatedSeller: Seller) => {
    const newSellers = sellers.map(s => 
      s.id === updatedSeller.id ? updatedSeller : s
    );
    setSellers(newSellers);
    
    // Uppdatera global cache också
    if (sellersCache) {
      sellersCache = newSellers;
      cacheTimestamp = Date.now();
    }
  }, [sellers]);

  // Setup realtime listener
  useEffect(() => {
    // Ladda initial data
    loadSellers();

    // Setup realtime listener för sellers
    console.log('📡 Setting up sellers realtime listener');
    channelRef.current = supabase
      .channel('sellers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers' },
        (payload) => {
          console.log('📡 Sellers realtime update:', payload.eventType, payload.new || payload.old);
          
          // Ladda om data vid ändringar
          loadSellers(true);
        }
      )
      .subscribe((status) => {
        console.log('📡 Sellers realtime status:', status);
      });

    return () => {
      if (channelRef.current) {
        console.log('📡 Cleaning up sellers realtime listener');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadSellers]);

  return {
    sellers,
    loading,
    error,
    loadSellers,
    findSellerById,
    findSellerByName,
    getSeller,
    updateSellerInCache
  };
};