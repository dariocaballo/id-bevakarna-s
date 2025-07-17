import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { playApplauseSound } from '@/utils/sound';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useImageCache } from '@/hooks/useImageCache';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';

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

const Dashboard = () => {
  const { initializeAudio, preloadSellerSounds, playSellerSound, ensureAudioContextReady, isInitialized } = useAudioManager();
  const { preloadImages, getCachedImage } = useImageCache();
  const [celebrationSale, setCelebrationSale] = useState<Sale | null>(null);
  const [celebrationAudioDuration, setCelebrationAudioDuration] = useState<number | undefined>(undefined);
  
  // Handle new sales with audio playback and celebration
  const handleNewSale = useCallback(async (sale: Sale, seller?: Seller) => {
    console.log('🔊 New sale detected:', sale.seller_name, sale.amount);
    console.log('🎵 Attempting to play sound for sale...');
    
    // Play seller sound and get duration for celebration sync
    try {
      const audioResult = await playSellerSound(sale.seller_id, sale.seller_name);
      
      if (audioResult.played) {
        console.log('✅ Successfully played sound for', sale.seller_name);
        // Set celebration duration to match audio duration
        setCelebrationAudioDuration(audioResult.duration);
      } else {
        console.log('🎵 No custom sound played for', sale.seller_name);
        // Use default duration if no audio
        setCelebrationAudioDuration(3000);
      }
    } catch (error) {
      console.error('❌ Error playing sound for', sale.seller_name, ':', error);
      setCelebrationAudioDuration(3000); // Default duration on error
    }
    
    // Trigger celebration overlay (will use the audio duration we just set)
    setCelebrationSale(sale);
  }, [playSellerSound]);

  // Handle seller updates for audio reloading
  const handleSellerUpdate = useCallback(async (updatedSellers: Seller[]) => {
    console.log('🔄 Sellers updated, reloading audio files...');
    await preloadSellerSounds(updatedSellers);
  }, [preloadSellerSounds]);

  // Use realtime data hook
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
    onNewSale: handleNewSale,
    onSellerUpdate: handleSellerUpdate,
    enableAutoRefresh: true,
    refreshInterval: 30000
  });

  // Initialize audio and preload resources when sellers data is available
  useEffect(() => {
    if (sellers.length === 0) return;

    console.log('🎵 Initializing audio and preloading resources...');
    
    // Initialize audio context on user interaction
    const handleUserInteraction = () => {
      initializeAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
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
    };
  }, [sellers, initializeAudio, preloadSellerSounds, preloadImages]);

  // Long-term stability: Resume audio context periodically
  useEffect(() => {
    const audioHealthCheck = setInterval(async () => {
      console.log('🔍 Checking audio context health...');
      await ensureAudioContextReady();
    }, 60000); // Check every minute

    return () => clearInterval(audioHealthCheck);
  }, [ensureAudioContextReady]);

  // Prevent page from sleeping on TV displays
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('📺 Screen wake lock acquired');
        }
      } catch (error) {
        console.log('📺 Wake lock not supported or failed:', error);
      }
    };

    requestWakeLock();

    // Handle visibility change to re-acquire wake lock
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLock !== null && wakeLock.released) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  // Optimized image rendering with cache and fallback
  const renderSellerImage = useCallback((seller: { name: string; imageUrl?: string }, size: string = "w-20 h-20") => {
    console.log('📸 Rendering image for', seller.name + ':', seller.imageUrl);
    
    if (!seller.imageUrl) {
      return (
        <span className="text-lg font-bold text-slate-800">
          {seller.name.charAt(0).toUpperCase()}
        </span>
      );
    }

    const cachedImageUrl = getCachedImage(seller.imageUrl);
    
    return (
      <img 
        src={cachedImageUrl || seller.imageUrl}
        alt={seller.name}
        className={`${size} object-cover`}
        onError={(e) => {
          console.error('❌ Image failed to load for', seller.name);
          // Hide broken image and show fallback
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
        onLoad={() => {
          console.log('✅ Image loaded successfully for', seller.name);
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

  // Check if night mode is active
  const isNightTime = () => {
    const now = new Date();
    const hour = now.getHours();
    return settings.night_mode_enabled === 'true' && (hour >= 18 || hour <= 9);
  };

  // Get seller info for celebration
  const getSeller = (sale: Sale) => {
    return sellers.find(s => s.id === sale.seller_id);
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
                      {renderSellerImage(todaysSellers[0], "w-full h-full")}
                      {/* Fallback element */}
                      <span className="text-lg font-bold text-slate-800" style={{display: 'none'}}>
                        {todaysSellers[0].name.charAt(0).toUpperCase()}
                      </span>
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