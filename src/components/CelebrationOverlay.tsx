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
    console.log(`🎉 Starting celebration for ${sale.seller_name} - Duration: ${celebrationDuration}ms`);

    // Start animation
    setIsVisible(true);

    // Trigger confetti if enabled - sync with audio duration
    if (showConfetti) {
      const animationEnd = Date.now() + celebrationDuration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / celebrationDuration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    }

    // Hide celebration when audio finishes - sync with audio duration
    const timer = setTimeout(() => {
      console.log(`🎉 Celebration ending for ${sale.seller_name}`);
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out
    }, celebrationDuration);

    return () => {
      clearTimeout(timer);
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