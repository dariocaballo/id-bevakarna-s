import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
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
  // Audio unlock state — one-time per page load
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Celebration state
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationData[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationData | null>(null);
  
  // UI state
  const [forceShowDashboard, setForceShowDashboard] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<{name: string, amount: number} | null>(null);
  
  // Refs for cleanup
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

  // Audio unlock handler
  const handleUnlockAudio = useCallback(() => {
    // Play a silent sound to unlock audio context
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      ctx.resume();
      console.log('🔓 Audio context unlocked');
    } catch (e) {
      console.log('⚠️ AudioContext unlock failed, falling back to Audio element');
    }

    // Also play a silent Audio element to unlock HTMLAudioElement playback
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silentAudio.volume = 0;
      silentAudio.play().then(() => {
        silentAudio.pause();
        console.log('🔓 HTML Audio unlocked');
      }).catch(() => {});
    } catch (e) {}

    setAudioUnlocked(true);
  }, []);

  // Start confetti animation
  const startConfetti = useCallback(() => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    });

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

  // End current celebration and allow next in queue
  const endCelebration = useCallback(() => {
    console.log('🏁 Ending celebration');
    
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
    
    stopConfetti();
    setCurrentCelebration(null);
  }, [stopConfetti]);

  // Process celebration queue
  useEffect(() => {
    if (currentCelebration || celebrationQueue.length === 0) {
      return;
    }

    const next = celebrationQueue[0];
    console.log('🎊 Starting celebration for:', next.sale.seller_name);
    
    setCelebrationQueue(prev => prev.slice(1));
    
    // Enhanced seller matching
    let matchedSeller = next.seller;
    if (!matchedSeller && next.sale.seller_id && sellers.length > 0) {
      matchedSeller = sellers.find(s => s.id === next.sale.seller_id);
    }
    if (!matchedSeller && next.sale.seller_name && sellers.length > 0) {
      matchedSeller = sellers.find(s => s.name.toLowerCase() === next.sale.seller_name.toLowerCase());
    }
    
    const hasAudio = !!matchedSeller?.sound_file_url && audioUnlocked;
    
    setCurrentCelebration({
      sale: next.sale,
      seller: matchedSeller,
      hasAudio
    });
    
    // Start confetti immediately
    startConfetti();
    
    if (!hasAudio) {
      // No audio - use default timeout
      celebrationTimeoutRef.current = setTimeout(() => {
        endCelebration();
      }, DEFAULT_CELEBRATION_DURATION);
    }
    // If hasAudio, AudioManager's onEnded will call endCelebration
  }, [celebrationQueue, currentCelebration, sellers, startConfetti, endCelebration, audioUnlocked]);

  // Audio callback - when audio ends, end celebration
  const handleAudioEnded = useCallback(() => {
    console.log('🎵 Audio ended - ending celebration');
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

  // Audio unlock overlay — shown only once per page load
  if (!audioUnlocked) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white shadow-lg flex items-center justify-center">
            <Volume2 className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">ID-Bevakarna</h1>
          <h2 className="text-lg text-blue-600 mb-6">Sales Dashboard</h2>
          <p className="text-sm text-blue-500 mb-8">Klicka för att starta dashboarden med ljud</p>
          <Button
            onClick={handleUnlockAudio}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg font-semibold"
          >
            ▶️ Starta Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-300 shadow-lg">
                        {renderSellerImage(seller)}
                        <span className="fallback-initial text-lg font-bold text-slate-800" style={{display: 'none'}}>
                          {seller.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -top-1 -right-1 text-lg">
                        {getMedalIcon(index)}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800 text-xs leading-tight">{seller.name}</p>
                      <p className="text-sm font-bold text-blue-700 leading-tight">{formatCurrency(seller.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly top sellers */}
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
          onStarted={() => console.log('🎵 Audio started for', currentCelebration.sale.seller_name)}
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
