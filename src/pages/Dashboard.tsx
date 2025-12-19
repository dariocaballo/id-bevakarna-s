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

interface CelebrationData {
  sale: Sale;
  seller?: Seller;
  hasAudio: boolean;
}

const DEFAULT_CELEBRATION_DURATION = 3000;

const Dashboard = () => {
  // Celebration state
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationData[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationData | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // UI state
  const [forceShowDashboard, setForceShowDashboard] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<{name: string, amount: number} | null>(null);
  
  // Refs for cleanup and preventing stale closures
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Use realtime data hook
  const {
    totalToday,
    totalMonth,
    topSellers,
    todaysSellers,
    sellers,
    isLoading
  } = useRealtimeData({
    onNewSale: useCallback((sale: Sale, seller?: Seller) => {
      console.log('🎉 New sale received:', sale.seller_name, sale.amount_tb);
      
      const celebrationData: CelebrationData = {
        sale,
        seller,
        hasAudio: !!seller?.sound_file_url
      };
      
      setCelebrationQueue(prev => [...prev, celebrationData]);
    }, []),
    onSellerUpdate: useCallback((updatedSellers: Seller[]) => {
      console.log('👤 Sellers updated:', updatedSellers.length);
    }, []),
    enableAutoRefresh: true,
    refreshInterval: 30000
  });

  // Failsafe: Force show dashboard after 5 seconds
  useEffect(() => {
    isMountedRef.current = true;
    
    loadingTimeoutRef.current = setTimeout(() => {
      if (!forceShowDashboard) {
        console.log('⚠️ Loading timeout - forcing dashboard display');
        setForceShowDashboard(true);
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Start confetti animation
  const startConfetti = useCallback(() => {
    // Clear existing confetti interval
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }

    // Initial burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    });

    // Continuous confetti
    confettiIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
        });
      }
    }, 800);
  }, []);

  // Stop confetti
  const stopConfetti = useCallback(() => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  }, []);

  // End current celebration and process next
  const endCelebration = useCallback(() => {
    console.log('🏁 Ending celebration');
    
    // Clear any pending timeout
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
    
    // Stop confetti
    stopConfetti();
    
    // Clear current celebration
    setCurrentCelebration(null);
    setIsPlayingAudio(false);
    
    // Process next in queue after short delay for UI cleanup
    setTimeout(() => {
      if (isMountedRef.current) {
        setCelebrationQueue(prev => {
          if (prev.length > 0) {
            // Trigger processing of next item
            return prev;
          }
          return prev;
        });
      }
    }, 300);
  }, [stopConfetti]);

  // Process celebration queue
  useEffect(() => {
    // Only process if no current celebration and queue has items
    if (currentCelebration || celebrationQueue.length === 0) {
      return;
    }

    const next = celebrationQueue[0];
    console.log('🎊 Starting celebration for:', next.sale.seller_name);
    
    // Remove from queue
    setCelebrationQueue(prev => prev.slice(1));
    
    // Enhanced seller matching
    let matchedSeller = next.seller;
    if (!matchedSeller && next.sale.seller_id && sellers.length > 0) {
      matchedSeller = sellers.find(s => s.id === next.sale.seller_id);
    }
    if (!matchedSeller && next.sale.seller_name && sellers.length > 0) {
      matchedSeller = sellers.find(s => s.name.toLowerCase() === next.sale.seller_name.toLowerCase());
    }
    
    const hasAudio = !!matchedSeller?.sound_file_url;
    
    // Set current celebration
    setCurrentCelebration({
      sale: next.sale,
      seller: matchedSeller,
      hasAudio
    });
    
    if (hasAudio) {
      // Audio will control celebration duration
      setIsPlayingAudio(true);
      // Confetti starts when audio starts (via onStarted callback)
    } else {
      // No audio - start confetti and set timeout
      startConfetti();
      celebrationTimeoutRef.current = setTimeout(() => {
        endCelebration();
      }, DEFAULT_CELEBRATION_DURATION);
    }
  }, [celebrationQueue, currentCelebration, sellers, startConfetti, endCelebration]);

  // Audio callbacks
  const handleAudioStarted = useCallback(() => {
    console.log('🎵 Audio started - starting confetti');
    startConfetti();
  }, [startConfetti]);

  const handleAudioEnded = useCallback(() => {
    console.log('🎵 Audio ended');
    endCelebration();
  }, [endCelebration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConfetti();
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, [stopConfetti]);

  // Memoized helpers
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

  // Show loading state
  if (isLoading && !forceShowDashboard) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600">Laddar dashboard...</p>
          <p className="text-xs text-blue-400 mt-2">Ansluter till databasen...</p>
        </div>
      </div>
    );
  }

  // Get audio URL for current celebration
  const audioUrl = currentCelebration?.seller?.sound_file_url 
    ? getVersionedUrl(currentCelebration.seller.sound_file_url, currentCelebration.seller.updated_at) || currentCelebration.seller.sound_file_url
    : undefined;

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
          sale={currentCelebration?.sale || null}
          sellerImage={currentCelebration?.seller?.profile_image_url ? 
            getVersionedUrl(currentCelebration.seller.profile_image_url, currentCelebration.seller.updated_at) || currentCelebration.seller.profile_image_url
            : undefined}
          onComplete={endCelebration}
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

      {/* Audio Manager - only render when celebration has audio */}
      {currentCelebration?.hasAudio && audioUrl && (
        <AudioManager 
          key={currentCelebration.sale.id}
          soundUrl={audioUrl}
          onEnded={handleAudioEnded}
          onStarted={handleAudioStarted}
          autoPlay={true}
          sellerName={currentCelebration.seller?.name}
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
