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

  // Enhanced audio context management for 24/7 operation with aggressive recovery
  const ensureAudioContextReady = useCallback(async () => {
    const now = Date.now();
    
    if (!audioManager.current.audioContext) {
      console.log('🎵 Audio context not initialized, initializing now...');
      initializeAudio();
    }

    if (audioManager.current.audioContext) {
      const state = audioManager.current.audioContext.state;
      console.log(`🎵 Audio context state: ${state} at ${new Date().toISOString()}`);
      
      if (state === 'suspended') {
        console.log('🎵 Audio context suspended/interrupted, resuming for 24/7 operation...');
        try {
          // Force user interaction if needed for autoplay policy
          if (document.hidden === false) {
            // Try to create a minimal user interaction
            const silentClick = new MouseEvent('click', { bubbles: false });
            document.dispatchEvent(silentClick);
          }
          
          await audioManager.current.audioContext.resume();
          console.log('✅ Audio context resumed successfully');
          
          // Verify it's actually running with multiple checks
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
          
          if (audioManager.current.audioContext.state === 'running') {
            console.log('✅ Audio context confirmed running');
            
            // Test audio capability with silent test
            try {
              const oscillator = audioManager.current.audioContext.createOscillator();
              const gainNode = audioManager.current.audioContext.createGain();
              gainNode.gain.setValueAtTime(0, audioManager.current.audioContext.currentTime);
              oscillator.connect(gainNode);
              gainNode.connect(audioManager.current.audioContext.destination);
              oscillator.start();
              oscillator.stop(audioManager.current.audioContext.currentTime + 0.001);
              console.log('✅ Audio context test successful');
            } catch (testError) {
              console.warn('⚠️ Audio context test failed:', testError);
            }
          } else {
            console.warn('⚠️ Audio context not running after resume attempt, state:', audioManager.current.audioContext.state);
            throw new Error('Audio context not running after resume');
          }
        } catch (error) {
          console.error('❌ Failed to resume audio context:', error);
          
          // Aggressive recovery - recreate audio context
          try {
            console.log('🔄 Attempting aggressive audio context recreation...');
            if (audioManager.current.audioContext && audioManager.current.audioContext.state !== 'closed') {
              await audioManager.current.audioContext.close();
            }
            
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioManager.current.audioContext = new AudioContextClass();
            
            // Wait for context to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (audioManager.current.audioContext.state === 'suspended') {
              await audioManager.current.audioContext.resume();
            }
            
            audioManager.current.isInitialized = true;
            console.log('✅ Audio context aggressively recreated successfully, state:', audioManager.current.audioContext.state);
          } catch (recreateError) {
            console.error('❌ Failed to recreate audio context:', recreateError);
            audioManager.current.isInitialized = false;
          }
        }
      } else if (state === 'closed') {
        console.log('🔄 Audio context closed, reinitializing...');
        initializeAudio();
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

  // Enhanced cleanup and periodic maintenance for 24/7 operation with aggressive monitoring
  useEffect(() => {
    // Aggressive audio health check for long-term stability
    const audioHealthInterval = setInterval(async () => {
      console.log('🔍 Performing comprehensive audio health check for 24/7 operation...');
      
      if (audioManager.current.audioContext) {
        const state = audioManager.current.audioContext.state;
        console.log(`🎵 Audio context health: ${state} at ${new Date().toISOString()}`);
        
        if (state === 'suspended' || state === 'closed') {
          console.log('🔧 Audio context needs immediate attention, ensuring readiness...');
          await ensureAudioContextReady();
        } else if (state === 'running') {
          // Proactive test when running to ensure it still works
          try {
            const testOscillator = audioManager.current.audioContext.createOscillator();
            const testGain = audioManager.current.audioContext.createGain();
            testGain.gain.setValueAtTime(0, audioManager.current.audioContext.currentTime);
            testOscillator.connect(testGain);
            testGain.connect(audioManager.current.audioContext.destination);
            testOscillator.start();
            testOscillator.stop(audioManager.current.audioContext.currentTime + 0.001);
            console.log('✅ Proactive audio test successful');
          } catch (testError) {
            console.warn('⚠️ Proactive audio test failed, reinitializing:', testError);
            await ensureAudioContextReady();
          }
        }
      } else {
        console.warn('⚠️ Audio context missing, reinitializing...');
        initializeAudio();
      }
      
      // Check preloaded audio integrity
      const preloadedCount = audioManager.current.preloadedAudio.size;
      console.log(`🎵 Preloaded audio files: ${preloadedCount}`);
      
      if (preloadedCount === 0) {
        console.warn('⚠️ No preloaded audio found, may need re-initialization');
      }
      
      // Check if any preloaded audio is corrupted
      let corruptedCount = 0;
      audioManager.current.preloadedAudio.forEach((audio, sellerId) => {
        if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          console.warn(`⚠️ Corrupted audio detected for seller ${sellerId}`);
          corruptedCount++;
        }
      });
      
      if (corruptedCount > 0) {
        console.warn(`⚠️ Found ${corruptedCount} corrupted audio files, may need reloading`);
      }
    }, 2 * 60 * 1000); // More frequent checks every 2 minutes

    // Very aggressive wake-up check for TV displays
    const wakeUpInterval = setInterval(async () => {
      console.log('⏰ Performing wake-up check for TV display...');
      
      // Force audio context to stay awake
      if (audioManager.current.audioContext && audioManager.current.audioContext.state === 'running') {
        try {
          // Create silent audio to keep context active
          const silentBuffer = audioManager.current.audioContext.createBuffer(1, 1, audioManager.current.audioContext.sampleRate);
          const source = audioManager.current.audioContext.createBufferSource();
          const gain = audioManager.current.audioContext.createGain();
          
          source.buffer = silentBuffer;
          gain.gain.setValueAtTime(0, audioManager.current.audioContext.currentTime);
          
          source.connect(gain);
          gain.connect(audioManager.current.audioContext.destination);
          source.start();
          
          console.log('🎵 Silent audio pulse sent to keep context active');
        } catch (error) {
          console.warn('⚠️ Silent audio pulse failed:', error);
          await ensureAudioContextReady();
        }
      }
    }, 30 * 1000); // Every 30 seconds

    // Visibility change handler for immediate recovery
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible, checking audio context...');
        await ensureAudioContextReady();
      }
    };

    // Page focus handler for immediate recovery
    const handlePageFocus = async () => {
      console.log('🔍 Page focused, ensuring audio readiness...');
      await ensureAudioContextReady();
    };

    // User interaction handler to maintain audio permissions
    const handleUserInteraction = async () => {
      if (audioManager.current.audioContext && audioManager.current.audioContext.state === 'suspended') {
        console.log('👆 User interaction detected, resuming audio context...');
        await ensureAudioContextReady();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handlePageFocus);
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      clearInterval(audioHealthInterval);
      clearInterval(wakeUpInterval);
      
      // Enhanced cleanup
      console.log('🧹 Enhanced AudioManager cleanup...');
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handlePageFocus);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      
      // Clear all preloaded audio
      audioManager.current.preloadedAudio.clear();
      
      // Close audio context properly
      if (audioManager.current.audioContext && audioManager.current.audioContext.state !== 'closed') {
        audioManager.current.audioContext.close();
      }
      
      audioManager.current.isInitialized = false;
      console.log('🎵 AudioManager cleaned up for 24/7 operation');
    };
  }, [ensureAudioContextReady, initializeAudio]);

  return {
    initializeAudio,
    preloadSellerSounds,
    playSellerSound,
    ensureAudioContextReady,
    isInitialized: audioManager.current.isInitialized
  };
};