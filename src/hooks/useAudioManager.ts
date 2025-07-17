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

  // Play seller sound with fallback
  const playSellerSound = useCallback(async (sellerId?: string, sellerName?: string) => {
    try {
      if (!sellerId) {
        console.log('❌ No seller ID provided for sound playback');
        return false;
      }

      const preloadedAudio = audioManager.current.preloadedAudio.get(sellerId);
      
      if (preloadedAudio) {
        // Clone the audio to allow multiple simultaneous plays
        const audioClone = new Audio();
        audioClone.src = preloadedAudio.src;
        audioClone.volume = 1.0;
        audioClone.crossOrigin = 'anonymous';
        
        console.log(`🎵 Playing preloaded sound for ${sellerName || 'Unknown seller'}`);
        await audioClone.play();
        console.log(`✅ Successfully played sound for ${sellerName || 'Unknown seller'}`);
        return true;
      } else {
        console.log(`❌ No preloaded sound found for ${sellerName || 'Unknown seller'} (ID: ${sellerId})`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error playing sound for ${sellerName || 'Unknown seller'}:`, error);
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all preloaded audio
      audioManager.current.preloadedAudio.clear();
      
      // Close audio context
      if (audioManager.current.audioContext && audioManager.current.audioContext.state !== 'closed') {
        audioManager.current.audioContext.close();
      }
      
      console.log('🎵 AudioManager cleaned up');
    };
  }, []);

  return {
    initializeAudio,
    preloadSellerSounds,
    playSellerSound,
    isInitialized: audioManager.current.isInitialized
  };
};