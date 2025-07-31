import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useImageCache } from '@/hooks/useImageCache';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { Trophy, Medal, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Sale {
  id: string;
  seller_name: string;
  seller_id?: string;
  amount: number;
  tb_amount?: number;
  units?: number;
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

const Dashboard = () => {
  const { initializeAudio, preloadSellerSounds, playSellerSound, ensureAudioContextReady } = useAudioManager();
  const { preloadImages, getCachedImage } = useImageCache();
  const [celebrationSale, setCelebrationSale] = useState<Sale | null>(null);
  const [celebrationAudioDuration, setCelebrationAudioDuration] = useState<number | undefined>(undefined);
  
  // Handle new sales with enhanced audio playback and celebration for 24/7 operation
  const handleNewSale = useCallback(async (sale: Sale, seller?: Seller) => {
    console.log('🎆🎆🎆 DASHBOARD CELEBRATION TRIGGERED! 🎆🎆🎆');
    console.log('📊 Sale details:', {
      id: sale.id,
      seller_name: sale.seller_name,
      seller_id: sale.seller_id,
      amount: sale.amount,
      timestamp: sale.timestamp,
      service_type: sale.service_type
    });
    console.log('👤 Seller details:', seller);
    
    // Ensure audio is ready for 24/7 operation
    await ensureAudioContextReady();
    
    // Play seller sound and get duration for celebration sync
    try {
      console.log('🎵 Attempting to play seller sound...');
      const audioResult = await playSellerSound(sale.seller_id, sale.seller_name);
      
      if (audioResult.played) {
        // Set celebration duration to match audio duration
        console.log('🎵 Audio played successfully, duration:', audioResult.duration);
        setCelebrationAudioDuration(audioResult.duration);
      } else {
        // Use default duration if no audio
        console.log('🎵 No custom audio, using default duration');
        setCelebrationAudioDuration(3000);
      }
    } catch (error) {
      console.error('❌ Error playing sound:', error);
      setCelebrationAudioDuration(3000); // Default duration on error
    }
    
    // Trigger celebration overlay
    console.log('🎆 Setting celebration sale - overlay should appear now!');
    setCelebrationSale(sale);
  }, [playSellerSound, ensureAudioContextReady]);

  // Enhanced seller updates with live audio reloading for 24/7 operation
  const handleSellerUpdate = useCallback(async (updatedSellers: Seller[]) => {
    console.log('🔄 Enhanced seller update - reloading audio files for TV operation...');
    await ensureAudioContextReady(); // Ensure audio is ready before reloading
    await preloadSellerSounds(updatedSellers); // Will automatically handle URL changes
    console.log('✅ Enhanced seller audio update complete');
  }, [preloadSellerSounds, ensureAudioContextReady]);

  // Use enhanced realtime data hook with TV-optimized settings - ONLY on dashboard
  const {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    lastSale,
    sellers,
    activeChallenges,
    settings,
    isLoading
  } = useRealtimeData({
    onNewSale: handleNewSale, // Only trigger audio/celebration on dashboard
    onSellerUpdate: handleSellerUpdate,
    enableAutoRefresh: true,
    refreshInterval: 10000 // More frequent updates for TV display (10 seconds)
  });

  // State for El Clásico competition data
  const [idSales, setIdSales] = useState<Sale[]>([]);
  
  // Load El Clásico data
  useEffect(() => {
    const fetchIdSales = async () => {
      try {
        const now = new Date();
        const august1 = new Date(2025, 7, 1); // August 1, 2025
        const september30 = new Date(2025, 8, 30, 23, 59, 59); // September 30, 2025
        
        // Only fetch if we're in the competition period
        if (now < august1 || now > september30) {
          setIdSales([]);
          return;
        }

        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .eq('service_type', 'id_bevakarna')
          .gte('timestamp', august1.toISOString())
          .lte('timestamp', september30.toISOString());
        
        if (error) throw error;
        setIdSales(data || []);
      } catch (error) {
        console.error('Error loading El Clásico data:', error);
      }
    };
    
    fetchIdSales();
  }, []);

  // Calculate El Clásico competition data (ID-skydd count per seller using units)
  const elClasicoData = useMemo(() => {
    // Calculate ID-skydd count per seller using the units field
    const sellerIdCounts: { [key: string]: number } = {};
    idSales.forEach(sale => {
      sellerIdCounts[sale.seller_name] = (sellerIdCounts[sale.seller_name] || 0) + (sale.units || 1);
    });

    // Create array with seller data
    return sellers.map(seller => {
      const idCount = sellerIdCounts[seller.name] || 0;
      return {
        name: seller.name,
        idCount,
        imageUrl: seller.profile_image_url,
        status: idCount >= 86 ? 'green' : idCount >= 65 ? 'yellow' : 'blue'
      };
    }).sort((a, b) => b.idCount - a.idCount);
  }, [sellers, idSales]);

  // Enhanced initialization for 24/7 TV operation
  useEffect(() => {
    if (sellers.length === 0) return;
    
    // Enhanced audio initialization for TV displays
    const handleUserInteraction = async () => {
      await initializeAudio();
      await ensureAudioContextReady();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('focus', handleUserInteraction);
    };
    
    // Multiple event listeners for better TV compatibility
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('focus', handleUserInteraction);
    
    // Immediate initialization attempt (for auto-started systems)
    initializeAudio();
    
    // Preload seller sounds
    preloadSellerSounds(sellers);
    
    // Preload seller images
    const imageUrls = sellers
      .map(seller => seller.profile_image_url)
      .filter(url => url) as string[];
    
    if (imageUrls.length > 0) {
      preloadImages(imageUrls);
    }
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('focus', handleUserInteraction);
    };
  }, [sellers, initializeAudio, ensureAudioContextReady, preloadSellerSounds, preloadImages]);

  // Optimized image rendering with cache and fallback
  const renderSellerImage = useCallback((seller: { name: string; imageUrl?: string }, size: string = "w-8 h-8") => {
    if (!seller.imageUrl) {
      return (
        <span className="text-sm font-bold text-slate-800">
          {seller.name.charAt(0).toUpperCase()}
        </span>
      );
    }

    const cachedImageUrl = getCachedImage(seller.imageUrl);
    
    return (
      <img 
        src={cachedImageUrl || seller.imageUrl}
        alt={seller.name}
        className={`${size} object-cover rounded-full`}
        onError={(e) => {
          // Hide broken image and show fallback
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
      />
    );
  }, [getCachedImage]);

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

  // Get seller info for celebration
  const getSeller = (sale: Sale) => {
    return sellers.find(s => s.id === sale.seller_id);
  };

  return (
    <div className="h-screen overflow-hidden p-3 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header - Kompakt enligt spec */}
        <div className="text-center mb-3 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-1 text-blue-800">ID-Bevakarna</h1>
          <h2 className="text-lg font-semibold text-blue-600">Sales Dashboard</h2>
        </div>

        {/* Celebration Overlay */}
        <CelebrationOverlay
          sale={celebrationSale}
          sellerImage={celebrationSale ? getSeller(celebrationSale)?.profile_image_url : undefined}
          onComplete={() => {
            setCelebrationSale(null);
            setCelebrationAudioDuration(undefined);
          }}
          showBubble={settings.show_bubble !== false}
          showConfetti={settings.show_confetti !== false}
          audioDuration={celebrationAudioDuration}
        />

        {/* Layout enligt specifikation */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          
          {/* Totalt TB (dag + månad) */}
          <div className="flex gap-3 h-24">
            <Card className="flex-1 shadow-md border-0 bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">DAGENS TB</h3>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalToday)}</div>
              </CardContent>
            </Card>
            <Card className="flex-1 shadow-md border-0 bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">MÅNADENS TB</h3>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalMonth)}</div>
              </CardContent>
            </Card>
          </div>

          {/* 🔵 Dagens försäljning per säljare (cirklar) */}
          <Card className="shadow-md border-0 bg-white flex-shrink-0" style={{height: '180px'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                🔵 Dagens försäljning per säljare
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex justify-center gap-6 flex-wrap">
                {todaysSellers.slice(0, 6).map((seller, index) => (
                  <div key={seller.name} className="flex flex-col items-center space-y-1">
                    {/* Stor cirkel med profilbild */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-300 shadow-lg">
                        {seller.imageUrl ? (
                          <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-slate-800">{seller.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Medalj */}
                      <div className="absolute -top-1 -right-1 text-lg">
                        {getMedalIcon(index)}
                      </div>
                    </div>
                    {/* Namn + Dagens TB */}
                    <div className="text-center">
                      <p className="font-bold text-slate-800 text-xs leading-tight">{seller.name}</p>
                      <p className="text-sm font-bold text-blue-700 leading-tight">{formatCurrency(seller.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nedre rad: Månadens toppsäljare & El Clásico */}
          <div className="flex gap-3 flex-1 min-h-0">
            {/* 🥇 Månadens toppsäljare */}
            <Card className="flex-1 shadow-md border-0 bg-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                  🥇 Månadens toppsäljare
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <div className="space-y-2">
                  {topSellers.slice(0, 4).map((seller, index) => (
                    <div key={seller.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-600">{index + 1}.</span>
                        <span className="font-semibold text-slate-800 text-sm">{seller.name}</span>
                      </div>
                      <span className="font-bold text-blue-700 text-sm">{formatCurrency(seller.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 🏆 El Clásico */}
            <Card className="flex-1 shadow-md border-0 bg-white overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                  🏆 El Clásico
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <div className="space-y-2">
                  {elClasicoData.slice(0, 4).map((seller) => (
                    <div key={seller.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{seller.name}</span>
                        {seller.status === 'green' && <Trophy className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <span className={`font-bold text-sm ${
                        seller.status === 'green' ? 'text-green-600' : 
                        seller.status === 'yellow' ? 'text-yellow-600' : 
                        'text-blue-600'
                      }`}>
                        {seller.idCount} / 86
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 🧩 Utmaning / Kung / Mål (om aktivt) */}
          {activeChallenges.length > 0 && (
            <Card className="shadow-md border-0 bg-white flex-shrink-0" style={{height: '100px'}}>
              <CardHeader className="pb-1">
                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                  🧩 Utmaning / Kung / Mål
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {activeChallenges.slice(0, 2).map((challenge) => (
                    <div key={challenge.id} className="flex-1 p-2 rounded bg-yellow-50 border border-yellow-200">
                      <h4 className="text-sm font-bold text-slate-800">{challenge.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">{challenge.description}</p>
                      <p className="text-sm font-bold text-blue-700 mt-1">Mål: {formatCurrency(challenge.target_amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;