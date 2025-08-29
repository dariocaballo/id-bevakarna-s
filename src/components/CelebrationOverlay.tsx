import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationOverlayProps {
  sale: {
    seller_name: string;
    amount_tb: number;
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

    // Enhanced celebration duration sync with precise audio timing
    const celebrationDuration = audioDuration || 3000;
    const startTime = Date.now();
    console.log(`🎉 Starting ENHANCED celebration for ${sale.seller_name} - Duration: ${celebrationDuration}ms at ${new Date().toISOString()}`);

    // Enhanced confetti pre-initialization for 24/7 TV operation
    if (showConfetti) {
      try {
        // Multiple initialization strategies for maximum reliability
        confetti({ particleCount: 1, startVelocity: 0, spread: 0, origin: { x: -1, y: -1 } });
        
        // Force canvas creation and GPU acceleration
        const canvas = document.querySelector('canvas[data-confetti-id]') as HTMLCanvasElement;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            context.save();
            context.restore();
          }
        }
        
        console.log('✅ Enhanced confetti pre-initialized successfully');
      } catch (error) {
        console.warn('⚠️ Enhanced confetti pre-initialization failed:', error);
      }
    }

    // Enhanced animation start with triple redundancy
    const startAnimation = () => {
      setIsVisible(true);
      console.log(`✅ Enhanced celebration visibility set to true (${Date.now() - startTime}ms after start)`);
    };
    
    // Triple redundancy for animation start
    requestAnimationFrame(startAnimation);
    setTimeout(startAnimation, 16); // Fallback after 1 frame
    setTimeout(startAnimation, 50); // Second fallback

    let confettiInterval: NodeJS.Timeout | null = null;
    let confettiTimeouts: NodeJS.Timeout[] = [];

    // Enhanced confetti system with precise timing and error recovery
    if (showConfetti) {
      const animationEnd = startTime + celebrationDuration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      // Enhanced initial confetti burst with retry mechanism
      const triggerInitialBurst = () => {
        try {
          confetti({
            ...defaults,
            particleCount: 150, // More particles for better TV visibility
            origin: { x: 0.5, y: 0.5 }
          });
          console.log('✅ Enhanced initial confetti burst triggered');
        } catch (error) {
          console.warn('⚠️ Enhanced initial confetti burst failed:', error);
          // Retry once after short delay
          const retryTimeout = setTimeout(() => {
            try {
              confetti({
                ...defaults,
                particleCount: 100,
                origin: { x: 0.5, y: 0.5 }
              });
              console.log('✅ Retry confetti burst successful');
            } catch (retryError) {
              console.warn('⚠️ Retry confetti burst also failed:', retryError);
            }
          }, 100);
          confettiTimeouts.push(retryTimeout);
        }
      };

      triggerInitialBurst();

      // Enhanced continuous confetti with precise timing
      confettiInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = animationEnd - now;
        const progress = 1 - (timeLeft / celebrationDuration);

        if (timeLeft <= 0) {
          if (confettiInterval) clearInterval(confettiInterval);
          return;
        }

        // Dynamic particle count based on time remaining and TV visibility
        const baseParticleCount = Math.max(30, 60 * (timeLeft / celebrationDuration));
        const particleCount = Math.floor(baseParticleCount);

        try {
          // Dual confetti bursts for better TV coverage
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
          
          // Extra center burst at 50% completion for emphasis
          if (progress >= 0.45 && progress <= 0.55) {
            confetti({
              ...defaults,
              particleCount: Math.floor(particleCount * 0.5),
              origin: { x: 0.5, y: 0.3 }
            });
          }
          
        } catch (error) {
          console.warn('⚠️ Enhanced confetti rendering failed:', error);
          if (confettiInterval) clearInterval(confettiInterval);
        }
      }, 200); // Slightly faster for better TV effect
    }

    // Enhanced celebration end with precise timing
    const celebrationEndTime = startTime + celebrationDuration;
    const timeToEnd = celebrationEndTime - Date.now();
    
    const timer = setTimeout(() => {
      const actualDuration = Date.now() - startTime;
      console.log(`🎉 Enhanced celebration ending for ${sale.seller_name} (actual duration: ${actualDuration}ms, target: ${celebrationDuration}ms)`);
      
      // Clean up confetti immediately
      if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
      }
      
      // Clear any pending timeouts
      confettiTimeouts.forEach(timeout => clearTimeout(timeout));
      confettiTimeouts = [];
      
      setIsVisible(false);
      
      // Enhanced completion with precise timing
      const fadeOutTimer = setTimeout(() => {
        const totalDuration = Date.now() - startTime;
        console.log(`🎉 Enhanced celebration complete for ${sale.seller_name} (total: ${totalDuration}ms)`);
        onComplete();
      }, 300);
      
      confettiTimeouts.push(fadeOutTimer);
    }, Math.max(0, timeToEnd));

    return () => {
      if (timer) clearTimeout(timer);
      if (confettiInterval) clearInterval(confettiInterval);
      confettiTimeouts.forEach(timeout => clearTimeout(timeout));
      
      console.log(`🧹 Enhanced celebration cleanup for ${sale.seller_name}`);
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
            Sålde {sale.amount_tb.toLocaleString('sv-SE')} TB!
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