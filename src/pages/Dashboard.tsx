import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { AudioManager } from '@/components/AudioManager';
import confetti from 'canvas-confetti';

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
  const [celebrationSale, setCelebrationSale] = useState<Sale | null>(null);
  const [currentAudio, setCurrentAudio] = useState<{ soundUrl: string; sellerName: string } | null>(null);
  const [confettiInterval, setConfettiInterval] = useState<NodeJS.Timeout | null>(null);

  const handleNewSale = useCallback(async (sale: Sale, seller?: Seller) => {
    setCelebrationSale(sale);
    
    // Clear any existing confetti
    if (confettiInterval) {
      clearInterval(confettiInterval);
      setConfettiInterval(null);
    }
    
    // Start confetti immediately
    const interval = setInterval(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 300);
    setConfettiInterval(interval);
    
    // Setup audio if available
    if (seller?.sound_file_url) {
      setCurrentAudio({
        soundUrl: seller.sound_file_url,
        sellerName: seller.name
      });
    } else {
      // No audio, stop confetti after 3 seconds
      setTimeout(() => {
        if (interval) clearInterval(interval);
        setConfettiInterval(null);
        setCelebrationSale(null);
      }, 3000);
    }
  }, [confettiInterval]);

  const { totalToday, totalMonth, topSellers, todaysSellers, sellers, isLoading } = useRealtimeData({
    onNewSale: handleNewSale
  });

  const getSeller = useCallback((sale: Sale) => {
    return sellers.find(s => 
      s.id === sale.seller_id || 
      s.name.toLowerCase() === sale.seller_name.toLowerCase()
    );
  }, [sellers]);

  const handleAudioEnded = useCallback(() => {
    if (confettiInterval) {
      clearInterval(confettiInterval);
      setConfettiInterval(null);
    }
    setCelebrationSale(null);
    setCurrentAudio(null);
  }, [confettiInterval]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(amount);
  }, []);

  const memoizedCards = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
      {/* Today's Sales */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white pb-3">
          <CardTitle className="text-lg">📈 Dagens försäljning</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {formatCurrency(totalToday)} tb
            </div>
            <div className="text-sm text-gray-600">Total idag</div>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todaysSellers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Inga försäljningar idag</p>
            ) : (
              todaysSellers.map((seller, index) => (
                <div key={`${seller.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {seller.imageUrl ? (
                      <img
                        src={seller.imageUrl}
                        alt={seller.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">
                          {seller.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium">{seller.name}</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {formatCurrency(seller.amount)} tb
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Top Sellers */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-3">
          <CardTitle className="text-lg">🏆 Månadens toppsäljare</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {formatCurrency(totalMonth)} tb
            </div>
            <div className="text-sm text-gray-600">Total denna månad</div>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {topSellers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Inga försäljningar denna månad</p>
            ) : (
              topSellers.map((seller, index) => (
                <div key={`${seller.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-600">
                      {index + 1}
                    </div>
                    {seller.imageUrl ? (
                      <img
                        src={seller.imageUrl}
                        alt={seller.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {seller.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium">{seller.name}</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(seller.amount)} tb
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [totalToday, totalMonth, topSellers, todaysSellers, formatCurrency]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
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
        {celebrationSale && (
          <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-4 border-yellow-400 animate-pulse">
              <div className="text-center">
                <div className="mb-4">
                  {(() => {
                    const seller = getSeller(celebrationSale);
                    return seller?.profile_image_url ? (
                      <img
                        src={seller.profile_image_url}
                        alt={celebrationSale.seller_name}
                        className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-yellow-400"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center mx-auto border-4 border-yellow-400">
                        <span className="text-4xl font-bold text-yellow-600">
                          {celebrationSale.seller_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-2">
                  {celebrationSale.seller_name}
                </h2>
                <p className="text-2xl text-gray-600 mb-2">rapporterade</p>
                <p className="text-5xl font-bold text-green-600">
                  {formatCurrency(celebrationSale.amount_tb)} tb
                </p>
                <p className="text-xl text-gray-500 mt-2">🎉 Grattis! 🎉</p>
              </div>
            </div>
          </div>
        )}

        {/* Audio Manager */}
        {currentAudio && (
          <AudioManager
            soundUrl={currentAudio.soundUrl}
            sellerName={currentAudio.sellerName}
            autoPlay={true}
            onEnded={handleAudioEnded}
          />
        )}

        {/* Main Content */}
        {memoizedCards}
      </div>
    </div>
  );
};

export default Dashboard;