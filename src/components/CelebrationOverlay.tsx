import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationOverlayProps {
  sale: {
    seller_name: string;
    amount: number;
    seller_id?: string;
  } | null;
  sellerImage?: string;
  onComplete: () => void;
  showBubble: boolean;
  showConfetti: boolean;
  audioDuration?: number; // Duration from audio playback in milliseconds
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  sale,
  sellerImage,
  onComplete,
  showBubble,
  showConfetti,
  audioDuration,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!sale) return;

    // Calculate celebration duration - sync with audio or use default
    const celebrationDuration = audioDuration || 3000; // Use audio duration or default 3 seconds
    console.log(`🎉 Starting celebration for ${sale.seller_name} - Duration: ${celebrationDuration}ms at ${new Date().toISOString()}`);

    // Force confetti initialization to prevent post-inactivity issues
    if (showConfetti) {
      try {
        // Pre-initialize confetti canvas to prevent rendering issues after long inactivity
        confetti({ particleCount: 1, startVelocity: 0, spread: 0, origin: { x: -1, y: -1 } });
        console.log('✅ Confetti pre-initialized successfully');
      } catch (error) {
        console.warn('⚠️ Confetti pre-initialization failed:', error);
      }
    }

    // Start animation with forced reflow to prevent rendering issues
    requestAnimationFrame(() => {
      setIsVisible(true);
      console.log('✅ Celebration visibility set to true');
    });

    let confettiInterval: NodeJS.Timeout | null = null;

    // Trigger confetti if enabled - sync with audio duration
    if (showConfetti) {
      const animationEnd = Date.now() + celebrationDuration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      // Start confetti with immediate first burst
      try {
        confetti({
          ...defaults,
          particleCount: 100,
          origin: { x: 0.5, y: 0.5 }
        });
        console.log('✅ Initial confetti burst triggered');
      } catch (error) {
        console.warn('⚠️ Initial confetti burst failed:', error);
      }

      confettiInterval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (confettiInterval) clearInterval(confettiInterval);
          return;
        }

        const particleCount = Math.max(20, 50 * (timeLeft / celebrationDuration));

        try {
          confetti({
            ...defaults,
            particleCount: Math.floor(particleCount),
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount: Math.floor(particleCount),
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        } catch (error) {
          console.warn('⚠️ Confetti rendering failed:', error);
          if (confettiInterval) clearInterval(confettiInterval);
        }
      }, 250);
    }

    // Hide celebration when audio finishes - sync with audio duration
    const timer = setTimeout(() => {
      console.log(`🎉 Celebration ending for ${sale.seller_name} at ${new Date().toISOString()}`);
      
      if (confettiInterval) {
        clearInterval(confettiInterval);
      }
      
      setIsVisible(false);
      setTimeout(() => {
        console.log(`🎉 Celebration complete for ${sale.seller_name}`);
        onComplete();
      }, 300); // Wait for fade out
    }, celebrationDuration);

    return () => {
      if (timer) clearTimeout(timer);
      if (confettiInterval) clearInterval(confettiInterval);
    };
  }, [sale, showConfetti, onComplete, audioDuration]);

  if (!sale || !showBubble) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4 transform transition-transform duration-500 ${
          isVisible ? 'scale-100' : 'scale-75'
        }`}
      >
        {/* Seller Image */}
        <div className="mb-6">
          <img
            src={sellerImage || '/placeholder.svg'}
            alt={sale.seller_name}
            className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg border-4 border-primary"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Sale Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">
            🎉 Grattis {sale.seller_name}!
          </h2>
          <p className="text-lg text-gray-600">
            Sålde {sale.amount.toLocaleString('sv-SE')} TB!
          </p>
        </div>

        {/* Celebration emojis */}
        <div className="mt-4 text-3xl animate-bounce">
          🎊 🎈 🎉
        </div>
      </div>
    </div>
  );
};