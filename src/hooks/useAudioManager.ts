import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Seller {
  id: string;
  name: string;
  sound_file_url?: string;
}

interface AudioInstance {
  audio: HTMLAudioElement;
  loaded: boolean;
  error?: string;
}

export const useAudioManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const audioCache = useRef<Map<string, AudioInstance>>(new Map());
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize Audio Context för att undvika browser-blockering
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
        console.log('🎧 AudioContext resumed');
      }
    } catch (error) {
      console.error('❌ AudioContext initialization failed:', error);
    }
  }, []);

  // Preladda alla säljares ljud
  const preloadSellerAudio = useCallback(async (sellers: Seller[]) => {
    console.log('🎧 Preloading audio for', sellers.length, 'sellers');
    
    await initializeAudioContext();

    const preloadPromises = sellers.map(async (seller) => {
      if (!seller.sound_file_url || audioCache.current.has(seller.id)) {
        return;
      }

      try {
        console.log(`🎧 Loading audio for ${seller.name}:`, seller.sound_file_url);
        
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.volume = 1.0;

        // Skapa löfte för laddning
        const loadPromise = new Promise<void>((resolve, reject) => {
          const onCanPlayThrough = () => {
            console.log(`✅ Audio loaded for ${seller.name}`);
            audioCache.current.set(seller.id, {
              audio,
              loaded: true
            });
            cleanup();
            resolve();
          };

          const onError = (error: any) => {
            console.error(`❌ Audio load failed for ${seller.name}:`, error);
            audioCache.current.set(seller.id, {
              audio,
              loaded: false,
              error: error.message || 'Load failed'
            });
            cleanup();
            reject(error);
          };

          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onCanPlayThrough);
            audio.removeEventListener('error', onError);
          };

          audio.addEventListener('canplaythrough', onCanPlayThrough);
          audio.addEventListener('error', onError);
          
          // Timeout efter 10 sekunder
          setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout'));
          }, 10000);
        });

        // Börja ladda
        audio.src = seller.sound_file_url;
        audio.load();

        await loadPromise;
      } catch (error) {
        console.error(`❌ Failed to preload audio for ${seller.name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    setIsInitialized(true);
    console.log('🎧 Audio preloading completed');
  }, [initializeAudioContext]);

  // Spela ljud för specifik säljare
  const playSellerSound = useCallback(async (sellerId: string, sellerName: string) => {
    try {
      await initializeAudioContext();

      const audioInstance = audioCache.current.get(sellerId);
      
      if (!audioInstance) {
        console.log(`❌ No audio cached for ${sellerName} (${sellerId})`);
        return false;
      }

      if (!audioInstance.loaded) {
        console.log(`❌ Audio not loaded for ${sellerName}:`, audioInstance.error);
        return false;
      }

      console.log(`🎵 Playing sound for ${sellerName}`);
      
      // Reset audio till början för att undvika problem med tidigare uppspelning
      audioInstance.audio.currentTime = 0;
      
      // Spela ljudet
      const playPromise = audioInstance.audio.play();
      
      if (playPromise) {
        await playPromise;
        console.log(`✅ Successfully played sound for ${sellerName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error playing sound for ${sellerName}:`, error);
      return false;
    }
  }, [initializeAudioContext]);

  // Hämta status för alla ljud
  const getAudioStatus = useCallback(() => {
    const status = Array.from(audioCache.current.entries()).map(([id, instance]) => ({
      sellerId: id,
      loaded: instance.loaded,
      error: instance.error
    }));
    return status;
  }, []);

  // Rensa cache
  const clearAudioCache = useCallback(() => {
    console.log('🧹 Clearing audio cache');
    audioCache.current.forEach((instance) => {
      instance.audio.src = '';
      instance.audio.load();
    });
    audioCache.current.clear();
    setIsInitialized(false);
  }, []);

  // Cleanup vid unmount
  useEffect(() => {
    return () => {
      clearAudioCache();
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [clearAudioCache]);

  return {
    isInitialized,
    preloadSellerAudio,
    playSellerSound,
    getAudioStatus,
    clearAudioCache
  };
};