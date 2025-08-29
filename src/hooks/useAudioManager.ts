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

  // Enhanced preload with live update support for seller sounds
  const preloadSellerSounds = useCallback(async (sellers: Array<{id: string, sound_file_url?: string, name: string}>) => {
    console.log('🎵 Starting enhanced preload of seller sounds:', sellers.length);
    
    // Clear outdated audio if seller URL changed
    const existingSellerIds = Array.from(audioManager.current.preloadedAudio.keys());
    for (const existingSellerId of existingSellerIds) {
      const currentSeller = sellers.find(s => s.id === existingSellerId);
      if (!currentSeller || !currentSeller.sound_file_url) {
        console.log(`🗑️ Removing outdated/missing audio for seller ${existingSellerId}`);
        audioManager.current.preloadedAudio.delete(existingSellerId);
      }
    }
    
    const preloadPromises = sellers
      .filter(seller => seller.sound_file_url)
      .map(async (seller) => {
        try {
          const existingAudio = audioManager.current.preloadedAudio.get(seller.id);
          
          // Check if we need to reload audio (different URL or no existing audio)
          if (existingAudio && existingAudio.src.includes(seller.sound_file_url!)) {
            console.log(`🎵 Sound already current for ${seller.name}`);
            return;
          }

          // Remove old audio if exists
          if (existingAudio) {
            console.log(`🔄 Updating audio for ${seller.name} (URL changed)`);
            audioManager.current.preloadedAudio.delete(seller.id);
          }

          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          audio.volume = 1.0;
          
          // Enhanced promise for load completion with buffer support
          const loadPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading audio'));
            }, 15000); // Extended timeout for TV environments

            audio.oncanplaythrough = () => {
              clearTimeout(timeout);
              console.log(`✅ Successfully preloaded sound for ${seller.name} (Duration: ${audio.duration?.toFixed(2)}s)`);
              resolve();
            };

            audio.onerror = (e) => {
              clearTimeout(timeout);
              console.error(`❌ Failed to preload sound for ${seller.name}:`, e);
              reject(e);
            };

            // Additional load event for better compatibility
            audio.onloadeddata = () => {
              console.log(`📁 Audio data loaded for ${seller.name}`);
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
    console.log(`🎵 Enhanced preloading complete. ${audioManager.current.preloadedAudio.size} sounds ready`);
  }, []);

  // Enhanced play with precise duration detection and error recovery
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
        // Enhanced duration detection - wait for metadata if needed
        let duration = preloadedAudio.duration;
        
        if (!duration || !isFinite(duration)) {
          console.log('🔍 Duration not available, waiting for metadata...');
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Metadata timeout')), 3000);
              
              const handleLoadedMetadata = () => {
                clearTimeout(timeout);
                preloadedAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                resolve();
              };
              
              if (preloadedAudio.readyState >= 1) {
                clearTimeout(timeout);
                resolve();
              } else {
                preloadedAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
                preloadedAudio.load(); // Force reload metadata
              }
            });
            
            duration = preloadedAudio.duration;
          } catch (metadataError) {
            console.warn('⚠️ Could not load metadata, using default duration');
          }
        }
        
        // Convert to milliseconds with fallback
        const durationMs = duration && isFinite(duration) 
          ? duration * 1000 // Convert seconds to milliseconds
          : 3000; // Default 3 seconds
        
        console.log(`🎵 Playing enhanced sound for ${sellerName || 'Unknown seller'} (Duration: ${durationMs}ms, Ready state: ${preloadedAudio.readyState})`);
        
        // Create optimized audio clone with buffering
        const audioClone = new Audio();
        audioClone.src = preloadedAudio.src;
        audioClone.volume = 1.0;
        audioClone.crossOrigin = 'anonymous';
        audioClone.preload = 'auto';
        
        // Enhanced error handling with fallback recovery
        try {
          await audioClone.play();
          console.log(`✅ Successfully played sound for ${sellerName || 'Unknown seller'}`);
          return { played: true, duration: durationMs };
        } catch (playError) {
          console.error(`❌ Audio play failed for ${sellerName || 'Unknown seller'}:`, playError);
          
          // Enhanced error recovery with retry mechanism
          if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
            console.log('🔧 Audio play blocked by browser policy, attempting recovery...');
            await ensureAudioContextReady();
          }
          
          // Try fallback with original preloaded audio
          try {
            console.log('🔄 Attempting fallback playback...');
            await preloadedAudio.play();
            return { played: true, duration: durationMs };
          } catch (fallbackError) {
            console.error('❌ Fallback playback also failed:', fallbackError);
            
            // Final fallback: generate applause sound
            try {
              console.log('🔄 Using applause fallback...');
              const { playApplauseSound } = await import('@/utils/sound');
              playApplauseSound();
              return { played: true, duration: 3000 }; // Default applause duration
            } catch (applauseError) {
              console.error('❌ Applause fallback failed:', applauseError);
              return { played: false };
            }
          }
        }
      } else {
        console.log(`❌ No preloaded sound found for ${sellerName || 'Unknown seller'} (ID: ${sellerId})`);
        
        // Fallback: try to play applause sound
        try {
          console.log('🔄 No seller sound found, using applause fallback...');
          const { playApplauseSound } = await import('@/utils/sound');
          playApplauseSound();
          return { played: true, duration: 3000 }; // Default applause duration
        } catch (fallbackError) {
          console.error('❌ Fallback applause failed:', fallbackError);
          return { played: false };
        }
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

    // Enhanced keep-alive system for TV displays with multiple strategies
    const wakeUpInterval = setInterval(async () => {
      console.log('⏰ Performing enhanced wake-up check for TV display...');
      
      // Strategy 1: Silent audio pulse to keep context active
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
          
          // Strategy 2: Test preloaded audio integrity
          const preloadedCount = audioManager.current.preloadedAudio.size;
          if (preloadedCount > 0) {
            // Verify first audio file is still accessible
            const firstAudio = Array.from(audioManager.current.preloadedAudio.values())[0];
            if (firstAudio && (firstAudio.error || firstAudio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) {
              console.warn('⚠️ Detected corrupted audio during wake-up check');
            }
          }
          
        } catch (error) {
          console.warn('⚠️ Silent audio pulse failed:', error);
          await ensureAudioContextReady();
        }
      }
      
      // Strategy 3: Prevent screen saver on TV displays
      try {
        // Create minimal DOM interaction to prevent sleep
        const preventSleepEvent = new Event('mousemove', { bubbles: false });
        document.dispatchEvent(preventSleepEvent);
      } catch (preventSleepError) {
        // Silent fail - not critical
      }
      
    }, 45 * 1000); // Every 45 seconds - optimized for TV displays

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