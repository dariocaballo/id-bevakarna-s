import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { AudioManager } from '@/components/AudioManager';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import confetti from 'canvas-confetti';
import { getVersionedUrl } from '@/utils/media';
import { MonthlySalesModal } from '@/components/MonthlySalesModal';

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
  updated_at?: string;
}

const Dashboard = () => {
  const [celebrationQueue, setCelebrationQueue] = useState<{sale: Sale, seller?: Seller}[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<{sale: Sale, seller?: Seller} | null>(null);
  const [celebrationAudioDuration, setCelebrationAudioDuration] = useState<number | undefined>(undefined);
  const [currentAudio, setCurrentAudio] = useState<{
    soundUrl: string;
    sellerName: string;
    sale: Sale;
    updatedAt?: string;
  } | null>(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{name: string, amount: number} | null>(null);

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
    onNewSale: useCallback(async (sale: Sale, seller?: Seller) => {
      setCelebrationQueue(prev => [...prev, { sale, seller }]);
    }, []),
    onSellerUpdate: useCallback(async (updatedSellers: Seller[]) => {
      // Seller data updated - no specific action needed
    }, []),
    enableAutoRefresh: true,
    refreshInterval: 30000
  });

  // Enhanced seller matching when processing celebrations
  const processNextCelebration = useCallback(() => {
    if (celebrationQueue.length > 0 && !currentCelebration) {
      const next = celebrationQueue[0];
      setCelebrationQueue(prev => prev.slice(1));
      
      // Stop any current audio/confetti immediately
      if (currentAudio) {
        setCurrentAudio(null);
        setCelebrationAudioDuration(undefined);
      }
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
        confettiIntervalRef.current = null;
      }
      
      // Enhanced seller matching using latest sellers data
      let matchedSeller = next.seller;
      if (!matchedSeller && next.sale.seller_id && sellers.length > 0) {
        matchedSeller = sellers.find(s => s.id === next.sale.seller_id);
      }
      if (!matchedSeller && next.sale.seller_name && sellers.length > 0) {
        matchedSeller = sellers.find(s => s.name.toLowerCase() === next.sale.seller_name.toLowerCase());
      }
      
      const enhancedNext = { ...next, seller: matchedSeller };
      setCurrentCelebration(enhancedNext);
      setAudioStarted(false);
      
      // Setup audio if available with proper cache busting
      if (matchedSeller?.sound_file_url) {
        const audioUrl = matchedSeller.sound_file_url;
        
        // Set up audio - confetti will start when audio starts playing
        setCurrentAudio({ 
          soundUrl: audioUrl,
          sellerName: matchedSeller.name,
          sale: enhancedNext.sale,
          updatedAt: matchedSeller.updated_at
        });
        setCelebrationAudioDuration(undefined); // Will be set by AudioManager
      } else {
        // No audio - start confetti immediately with default duration
        startConfetti();
        setCelebrationAudioDuration(3000);
      }
    }
  }, [celebrationQueue, currentCelebration, currentAudio, sellers]);

  // Start confetti animation
  const startConfetti = useCallback(() => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
    }

    // Initial burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    });

    // Continuous light confetti during audio
    confettiIntervalRef.current = setInterval(() => {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
      });
    }, 800);
  }, []);

  // Process queue when it changes
  useEffect(() => {
    processNextCelebration();
  }, [processNextCelebration]);


  // Memoized components for performance
  const renderSellerImage = useCallback((seller: { name: string; imageUrl?: string }) => {
    if (!seller.imageUrl) {
      return (
        <span className="text-lg font-bold text-slate-800">
          {seller.name.charAt(0).toUpperCase()}
        </span>
      );
    }
    
    return (
      <img 
        src={seller.imageUrl}
        alt={seller.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const fallback = target.parentElement?.querySelector('.fallback-initial');
          if (fallback) {
            (fallback as HTMLElement).style.display = 'flex';
          }
        }}
      />
    );
  }, []);

  const formatCurrency = useMemo(() => (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' tb';
  }, []);

  const getMedalIcon = useMemo(() => (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈'; 
      case 2: return '🥉';
      case 3: return '🏅';
      case 4: return '🏅';
      default: return '';
    }
  }, []);


  const handleAudioStarted = useCallback(() => {
    if (!audioStarted) {
      setAudioStarted(true);
      startConfetti();
    }
  }, [audioStarted, startConfetti]);

  const handleAudioDurationChange = useCallback((duration: number) => {
    setCelebrationAudioDuration(duration * 1000);
  }, []);

  const handleAudioEnded = useCallback(() => {
    // Clear current celebration immediately
    setCurrentAudio(null);
    setCelebrationAudioDuration(undefined);
    setCurrentCelebration(null);
    setAudioStarted(false);
    
    // Stop confetti
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
    
    // Process next in queue after a short delay to allow UI cleanup
    setTimeout(() => {
      processNextCelebration();
    }, 300);
  }, [processNextCelebration]);

  // Auto-clear celebration after timeout (for cases without audio)
  useEffect(() => {
    if (currentCelebration && celebrationAudioDuration && !currentAudio) {
      const timer = setTimeout(() => {
        handleAudioEnded();
      }, celebrationAudioDuration);

      return () => clearTimeout(timer);
    }
  }, [currentCelebration, celebrationAudioDuration, currentAudio, handleAudioEnded]);

  // Cleanup confetti on unmount
  useEffect(() => {
    return () => {
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
      }
    };
  }, []);

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

        {/* Celebration Overlay with Avatar */}
        <CelebrationOverlay
          sale={currentCelebration?.sale || null}
          sellerImage={currentCelebration?.seller?.profile_image_url ? 
            getVersionedUrl(currentCelebration.seller.profile_image_url, currentCelebration.seller.updated_at) || currentCelebration.seller.profile_image_url
            : undefined}
          onComplete={handleAudioEnded}
          audioDuration={celebrationAudioDuration}
          showBubble={true}
          showConfetti={true}
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
                        {renderSellerImage(seller)}
                        <span className="fallback-initial text-lg font-bold text-slate-800" style={{display: 'none'}}>
                          {seller.name.charAt(0).toUpperCase()}
                        </span>
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
                  <div 
                    key={seller.name} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedSeller(seller)}
                  >
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

      {/* Audio Manager */}
      {currentAudio && (
        <AudioManager 
          soundUrl={currentAudio.soundUrl}
          onEnded={handleAudioEnded}
          onDurationChange={handleAudioDurationChange}
          onStarted={handleAudioStarted}
          autoPlay={true}
          sellerName={currentAudio.sellerName}
          key={`${currentAudio.sale.id}-${currentAudio.updatedAt || Date.now()}`}
        />
      )}

      {/* Monthly Sales Modal */}
      <MonthlySalesModal
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        sellerName={selectedSeller?.name || ''}
        totalAmount={selectedSeller?.amount || 0}
      />
    </div>
  );
};

export default Dashboard;