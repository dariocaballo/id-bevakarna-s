import React, { useState, useEffect } from 'react';

interface Sale {
  id: string;
  seller_name: string;
  amount_tb: number;
  timestamp: string;
  seller_id?: string;
}

interface CelebrationOverlayProps {
  sale: Sale | null;
  sellerImage?: string;
  onComplete: () => void;
  showBubble?: boolean;
  showConfetti?: boolean;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  sale,
  sellerImage,
  onComplete,
  showBubble = true,
  showConfetti = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (sale) {
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      // Fade out animation when sale is cleared
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sale]);

  if (!isVisible || !sale) return null;

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(0, 0, 0, 0.1) 100%)'
      }}
    >
      {/* Pulsating rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-ping absolute w-32 h-32 rounded-full bg-green-400 opacity-20"></div>
        <div className="animate-ping absolute w-48 h-48 rounded-full bg-green-300 opacity-15" style={{animationDelay: '0.5s'}}></div>
        <div className="animate-ping absolute w-64 h-64 rounded-full bg-green-200 opacity-10" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main celebration card */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-4 border-green-500 max-w-md mx-auto text-center transform transition-all duration-500">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400 to-blue-500 opacity-20 blur-xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Success message */}
          <div className="mb-6">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-green-700 mb-1">GRYM SÄLJ!</h2>
            <p className="text-sm text-green-600">Fantastisk prestation!</p>
          </div>

          {/* Avatar section */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Animated glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-spin p-1">
                <div className="w-full h-full rounded-full bg-white"></div>
              </div>
              
              {/* Avatar */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center border-4 border-white shadow-lg">
                {sellerImage ? (
                  <img
                    src={sellerImage}
                    alt={sale.seller_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                
                {/* Fallback initials */}
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{ display: sellerImage ? 'none' : 'flex' }}
                >
                  <span className="text-2xl font-bold text-green-700">
                    {sale.seller_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seller info */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-800">
              {sale.seller_name}
            </h3>
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-full inline-block">
              <span className="text-xl font-bold">
                {sale.amount_tb.toLocaleString('sv-SE')} tb
              </span>
            </div>
          </div>

          {/* Sparkle effects */}
          <div className="absolute top-4 left-4 text-yellow-400 animate-pulse">✨</div>
          <div className="absolute top-6 right-6 text-yellow-400 animate-pulse" style={{animationDelay: '0.5s'}}>⭐</div>
          <div className="absolute bottom-8 left-6 text-yellow-400 animate-pulse" style={{animationDelay: '1s'}}>💫</div>
          <div className="absolute bottom-6 right-4 text-yellow-400 animate-pulse" style={{animationDelay: '1.5s'}}>✨</div>
        </div>
      </div>
    </div>
  );
};
