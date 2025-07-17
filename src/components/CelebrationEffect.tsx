import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CelebrationData {
  seller_name: string;
  seller_id?: string;
  amount: number;
  profile_image_url?: string;
  sound_file_url?: string;
  isTopSeller?: boolean;
}

interface CelebrationEffectProps {
  celebrationData: CelebrationData | null;
  onComplete: () => void;
  settings?: {
    showBubble: boolean;
    showConfetti: boolean;
    playSound: boolean;
    specialEffect: boolean;
  };
}

export const CelebrationEffect: React.FC<CelebrationEffectProps> = ({
  celebrationData,
  onComplete,
  settings = {
    showBubble: true,
    showConfetti: true,
    playSound: true,
    specialEffect: true
  }
}) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Initiera AudioContext en gång
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        setAudioContext(ctx);
        console.log('🎧 AudioContext initialized for celebration');
      } catch (error) {
        console.error('❌ AudioContext initialization failed:', error);
      }
    };

    initAudioContext();
  }, []);

  // Spela konfetti-effekt
  const triggerConfetti = (isTopSeller = false) => {
    if (!settings.showConfetti) return;

    const colors = isTopSeller 
      ? ['#FFD700', '#FFA500', '#FF6347', '#FFB6C1'] // Guld/rött för toppsäljare
      : ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']; // Blå/grön standard

    // Huvudkonfetti från toppen
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.1 },
      colors: colors,
      gravity: 0.8,
      scalar: 1.2,
      shapes: ['circle', 'square'],
      ticks: 300
    });

    // Extra konfetti från sidorna för toppsäljare
    if (isTopSeller && settings.specialEffect) {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#FFD700', '#FFA500'],
          shapes: ['star'],
          scalar: 1.5
        });
        
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#FFD700', '#FFA500'],
          shapes: ['star'],
          scalar: 1.5
        });
      }, 300);
    }
  };

  // Spela ljud
  const playSound = async (soundUrl?: string) => {
    if (!settings.playSound || !soundUrl) return;

    try {
      console.log('🎵 Playing celebration sound:', soundUrl);
      
      // Säkerställ att AudioContext är redo
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audio = new Audio(soundUrl);
      audio.crossOrigin = 'anonymous';
      audio.volume = 1.0;
      audio.preload = 'auto';

      const playPromise = audio.play();
      if (playPromise) {
        await playPromise;
        console.log('✅ Celebration sound played successfully');
      }
    } catch (error) {
      console.warn('⚠️ Celebration sound failed:', error);
      // Fallback ljud eller tyst fortsättning
    }
  };

  // Trigga alla effekter när celebration data kommer
  useEffect(() => {
    if (!celebrationData) return;

    console.log('🎉 Triggering celebration for:', celebrationData.seller_name);

    // Starta konfetti omedelbart
    triggerConfetti(celebrationData.isTopSeller);

    // Spela ljud
    if (celebrationData.sound_file_url) {
      playSound(celebrationData.sound_file_url);
    }

    // Auto-stäng efter 3 sekunder
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [celebrationData]);

  if (!celebrationData) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' tb';
  };

  return (
    <AnimatePresence>
      {celebrationData && settings.showBubble && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Bakgrund med liten genomskinlighet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />
          
          {/* Huvudbubble med säljare */}
          <motion.div
            initial={{ 
              scale: 0.5, 
              opacity: 0,
              rotateZ: -15,
              y: 50
            }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              rotateZ: 0,
              y: 0
            }}
            exit={{ 
              scale: 0.8, 
              opacity: 0,
              y: -30
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: 0.6
            }}
            className="relative bg-white rounded-3xl p-8 card-shadow text-center max-w-md mx-4"
          >
            {/* Krona för toppsäljare */}
            {celebrationData.isTopSeller && (
              <motion.div
                initial={{ scale: 0, rotateZ: -45 }}
                animate={{ scale: 1, rotateZ: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                className="absolute -top-6 left-1/2 transform -translate-x-1/2"
              >
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl animate-pulse">
                  👑
                </div>
              </motion.div>
            )}

            {/* Säljares profilbild */}
            <motion.div
              initial={{ scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="mb-6"
            >
              <Avatar className="w-32 h-32 mx-auto border-4 border-primary">
                <AvatarImage 
                  src={celebrationData.profile_image_url} 
                  alt={celebrationData.seller_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {celebrationData.seller_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Meddelande */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="text-6xl mb-4">💥</div>
              <h2 className="text-2xl font-bold text-primary">
                {celebrationData.seller_name}
              </h2>
              <p className="text-lg text-muted-foreground">
                sålde för
              </p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(celebrationData.amount)}!
              </p>
              
              {celebrationData.isTopSeller && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg font-semibold text-yellow-600"
                >
                  🏆 Dagens ledare!
                </motion.p>
              )}
            </motion.div>

            {/* Animerade partiklar runt bubblan */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    scale: 0,
                    x: 0,
                    y: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: [0, Math.cos(i * 45 * Math.PI / 180) * 60],
                    y: [0, Math.sin(i * 45 * Math.PI / 180) * 60],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.6 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute top-1/2 left-1/2 w-4 h-4 text-2xl"
                  style={{
                    transformOrigin: 'center'
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};