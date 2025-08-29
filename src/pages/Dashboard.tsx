import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { playApplauseSound } from '@/utils/sound';
import { useImageCache } from '@/hooks/useImageCache';
import { AudioManager } from '@/components/AudioManager';
import confetti from 'canvas-confetti';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';

interface Sale {
  id: string;
  seller_name: string;
  amount_tb: number;
  timestamp: string;
  seller_id?: string;
}

interface Seller {
  id: string;
  name: string;
  profile_image_url?: string;
  sound_file_url?: string;
}

const Dashboard = () => {
  const { preloadImages, getCachedImage } = useImageCache();
  const [celebrationSale, setCelebrationSale] = useState<Sale | null>(null);
  const [celebrationAudioDuration, setCelebrationAudioDuration] = useState<number | undefined>(undefined);
  const [currentAudio, setCurrentAudio] = useState<{ soundUrl: string; sellerName: string } | null>(null);

  // Handle new sales with immediate celebration
  const handleNewSale = useCallback(async (sale: Sale, seller?: Seller) => {
    console.log('🎆 DASHBOARD CELEBRATION TRIGGERED!');
    console.log('🎯 Ny försäljning:', `seller=${sale.seller_name}, tb=${sale.amount_tb}`);
    
    // Always trigger immediate confetti
    const triggerConfetti = () => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
      });
    };

    // Start confetti immediately
    triggerConfetti();
    
    // Play seller's audio if available
    if (seller?.sound_file_url) {
      console.log(`🎵 Playing sound for ${seller.name}: ${seller.sound_file_url}`);
      setCurrentAudio({ 
        soundUrl: seller.sound_file_url, 
        sellerName: seller.name 
      });
      // Reset duration for new audio
      setCelebrationAudioDuration(undefined);
    } else {
      console.log('🎵 No custom sound for seller');
      // No audio, use default 3 second duration
      setCelebrationAudioDuration(3000);
    }
    
    console.log('🎆 Setting celebration sale - overlay should appear now!');
    setCelebrationSale(sale);
  }, []);

  // Enhanced seller updates with live audio reloading
  const handleSellerUpdate = useCallback(async (updatedSellers: Seller[]) => {
    console.log('🔄 Enhanced seller update - reloading images...');
    
    const imageUrls = updatedSellers
      .map(seller => seller.profile_image_url)
      .filter(url => url) as string[];
    
    if (imageUrls.length > 0) {
      preloadImages(imageUrls);
    }
    
    console.log('✅ Enhanced seller update complete');
  }, [preloadImages]);

  // Use realtime data hook with TV-optimized settings
  const {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    sellers,
    settings,
    isLoading
  } = useRealtimeData({
    onNewSale: handleNewSale,
    onSellerUpdate: handleSellerUpdate,
    enableAutoRefresh: true,
    refreshInterval: 10000
  });

  // Initialize images
  useEffect(() => {
    if (sellers.length === 0) return;
    
    const imageUrls = sellers
      .map(seller => seller.profile_image_url)
      .filter(url => url) as string[];
    
    if (imageUrls.length > 0) {
      preloadImages(imageUrls);
    }
  }, [sellers, preloadImages]);

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
    }).format(amount) + ' tb';
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

  const handleAudioDurationChange = (duration: number) => {
    console.log(`🎵 Audio duration detected: ${duration}s`);
    // Convert duration from seconds to milliseconds for celebration overlay
    setCelebrationAudioDuration(duration * 1000);
  };

  const handleAudioEnded = () => {
    console.log('🎵 Audio playback completed');
    setCurrentAudio(null);
    setCelebrationAudioDuration(undefined);
  };

  // Get seller info for celebration
  const getSeller = (sale: Sale) => {
    return sellers.find(s => s.id === sale.seller_id);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600">Laddar dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden p-3 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-3 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-1 text-blue-800">ID-Bevakarna</h1>
          <h2 className="text-lg font-semibold text-blue-600">Sales Dashboard</h2>
        </div>

        {/* Celebration Overlay */}
        <CelebrationOverlay
          sale={celebrationSale}
          sellerImage={celebrationSale ? getSeller(celebrationSale)?.profile_image_url : undefined}
          onComplete={() => {
            console.log('✅ Celebration end');
            setCelebrationSale(null);
            setCelebrationAudioDuration(undefined);
            setCurrentAudio(null);
          }}
          showBubble={settings.show_bubble !== false}
          showConfetti={settings.show_confetti !== false}
          audioDuration={celebrationAudioDuration}
        />

        {/* Layout */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          
          {/* Total TB (day + month) */}
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

          {/* Today's sales per seller (circles) */}
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
                    {/* Large circle with profile image */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-300 shadow-lg">
                        {seller.imageUrl ? (
                          <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-slate-800">{seller.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Medal */}
                      <div className="absolute -top-1 -right-1 text-lg">
                        {getMedalIcon(index)}
                      </div>
                    </div>
                    {/* Name + Today's TB */}
                    <div className="text-center">
                      <p className="font-bold text-slate-800 text-xs leading-tight">{seller.name}</p>
                      <p className="text-sm font-bold text-blue-700 leading-tight">{formatCurrency(seller.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly top sellers - full width now */}
          <Card className="shadow-md border-0 bg-white overflow-hidden flex-1 min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                🥇 Månadens toppsäljare
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-2">
                {topSellers.slice(0, 10).map((seller, index) => (
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
        </div>
      </div>

      {/* Audio Manager for celebration sounds with autoplay handling */}
      {currentAudio && (
        <AudioManager
          soundUrl={currentAudio.soundUrl}
          onEnded={handleAudioEnded}
          onDurationChange={handleAudioDurationChange}
          autoPlay={true}
          sellerName={currentAudio.sellerName}
        />
      )}
    </div>
  );
};

export default Dashboard;