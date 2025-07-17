import { useCallback, useRef, useEffect } from 'react';

interface AudioManager {
  preloadedAudio: Map<string, HTMLAudioElement>;
  audioContext: AudioContext | null;
  isInitialized: boolean;
}

export const useAudioManager = () => {
  const audioManager = useRef<AudioManager>({
    preloadedAudio: new Map(),
    audioContext: null,
    isInitialized: false
  });

  // Initialize audio context and preload sounds
  const initializeAudio = useCallback(() => {
    if (audioManager.current.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioManager.current.audioContext = new AudioContextClass();
      
      if (audioManager.current.audioContext.state === 'suspended') {
        audioManager.current.audioContext.resume();
      }
      
      audioManager.current.isInitialized = true;
      console.log('🎵 AudioManager initialized successfully');
    } catch (error) {
      console.error('🎵 Failed to initialize audio context:', error);
    }
  }, []);

  // Enhanced audio context management for 24/7 operation
  const ensureAudioContextReady = useCallback(async () => {
    const now = Date.now();
    
    if (!audioManager.current.audioContext) {
      console.log('🎵 Audio context not initialized, initializing now...');
      initializeAudio();
    }

    if (audioManager.current.audioContext) {
      const state = audioManager.current.audioContext.state;
      console.log(`🎵 Audio context state: ${state}`);
      
      if (state === 'suspended') {
        console.log('🎵 Audio context suspended/interrupted, resuming for 24/7 operation...');
        try {
          await audioManager.current.audioContext.resume();
          console.log('✅ Audio context resumed successfully');
          
          // Verify it's actually running
          if (audioManager.current.audioContext.state === 'running') {
            console.log('✅ Audio context confirmed running');
          } else {
            console.warn('⚠️ Audio context not running after resume attempt');
          }
        } catch (error) {
          console.error('❌ Failed to resume audio context:', error);
          
          // Try to recreate audio context if resume fails
          try {
            console.log('🔄 Attempting to recreate audio context...');
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioManager.current.audioContext = new AudioContextClass();
            audioManager.current.isInitialized = true;
            console.log('✅ Audio context recreated successfully');
          } catch (recreateError) {
            console.error('❌ Failed to recreate audio context:', recreateError);
          }
        }
      }
    }
  }, [initializeAudio]);

  // Preload seller sounds into memory
  const preloadSellerSounds = useCallback(async (sellers: Array<{id: string, sound_file_url?: string, name: string}>) => {
    console.log('🎵 Starting to preload seller sounds:', sellers.length);
    
    const preloadPromises = sellers
      .filter(seller => seller.sound_file_url)
      .map(async (seller) => {
        try {
          if (audioManager.current.preloadedAudio.has(seller.id)) {
            console.log(`🎵 Sound already preloaded for ${seller.name}`);
            return;
          }

          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          audio.volume = 1.0;
          
          // Create promise for load completion
          const loadPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading audio'));
            }, 10000); // 10 second timeout

            audio.oncanplaythrough = () => {
              clearTimeout(timeout);
              console.log(`✅ Successfully preloaded sound for ${seller.name}`);
              resolve();
            };

            audio.onerror = (e) => {
              clearTimeout(timeout);
              console.error(`❌ Failed to preload sound for ${seller.name}:`, e);
              reject(e);
            };
          });

          audio.src = seller.sound_file_url!;
          audio.load();
          
          await loadPromise;
          audioManager.current.preloadedAudio.set(seller.id, audio);
        } catch (error) {
          console.error(`❌ Error preloading sound for ${seller.name}:`, error);
        }
      });

    await Promise.allSettled(preloadPromises);
    console.log(`🎵 Preloading complete. ${audioManager.current.preloadedAudio.size} sounds ready`);
  }, []);

  // Play seller sound with duration detection
  const playSellerSound = useCallback(async (sellerId?: string, sellerName?: string): Promise<{ played: boolean; duration?: number }> => {
    try {
      if (!sellerId) {
        console.log('❌ No seller ID provided for sound playback');
        return { played: false };
      }

      // Ensure audio context is ready before playing
      await ensureAudioContextReady();

      const preloadedAudio = audioManager.current.preloadedAudio.get(sellerId);
      
      if (preloadedAudio) {
        // Clone the audio to allow multiple simultaneous plays
        const audioClone = new Audio();
        audioClone.src = preloadedAudio.src;
        audioClone.volume = 1.0;
        audioClone.crossOrigin = 'anonymous';
        
        // Get duration (fallback to 3 seconds if not available)
        const duration = preloadedAudio.duration && isFinite(preloadedAudio.duration) 
          ? preloadedAudio.duration * 1000 // Convert to milliseconds
          : 3000; // Default 3 seconds
        
        console.log(`🎵 Playing preloaded sound for ${sellerName || 'Unknown seller'} (Duration: ${duration}ms)`);
        
        // Add error handling for play promise
        try {
          await audioClone.play();
          console.log(`✅ Successfully played sound for ${sellerName || 'Unknown seller'}`);
          return { played: true, duration };
        } catch (playError) {
          console.error(`❌ Audio play failed for ${sellerName || 'Unknown seller'}:`, playError);
          
          // Try to handle common audio play errors
          if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
            console.log('🔧 Audio play blocked by browser policy, trying to reinitialize...');
            await ensureAudioContextReady();
            // Don't retry here to avoid infinite loop
          }
          
          return { played: false };
        }
      } else {
        console.log(`❌ No preloaded sound found for ${sellerName || 'Unknown seller'} (ID: ${sellerId})`);
        return { played: false };
      }
    } catch (error) {
      console.error(`❌ Error playing sound for ${sellerName || 'Unknown seller'}:`, error);
      return { played: false };
    }
  }, [ensureAudioContextReady]);

  // Enhanced cleanup and periodic maintenance for 24/7 operation
  useEffect(() => {
    // Periodic audio health check for long-term stability
    const audioHealthInterval = setInterval(async () => {
      console.log('🔍 Performing audio health check for 24/7 operation...');
      
      if (audioManager.current.audioContext) {
        const state = audioManager.current.audioContext.state;
        console.log(`🎵 Audio context health: ${state}`);
        
        if (state === 'suspended') {
          console.log('🔧 Audio context needs attention, ensuring readiness...');
          await ensureAudioContextReady();
        }
      }
      
      // Check preloaded audio integrity
      const preloadedCount = audioManager.current.preloadedAudio.size;
      console.log(`🎵 Preloaded audio files: ${preloadedCount}`);
      
      if (preloadedCount === 0) {
        console.warn('⚠️ No preloaded audio found, may need re-initialization');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(audioHealthInterval);
      
      // Enhanced cleanup
      console.log('🧹 Enhanced AudioManager cleanup...');
      
      // Clear all preloaded audio
      audioManager.current.preloadedAudio.clear();
      
      // Close audio context properly
      if (audioManager.current.audioContext && audioManager.current.audioContext.state !== 'closed') {
        audioManager.current.audioContext.close();
      }
      
      audioManager.current.isInitialized = false;
      console.log('🎵 AudioManager cleaned up for 24/7 operation');
    };
  }, [ensureAudioContextReady]);

  return {
    initializeAudio,
    preloadSellerSounds,
    playSellerSound,
    ensureAudioContextReady,
    isInitialized: audioManager.current.isInitialized
  };
};