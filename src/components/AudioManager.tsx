import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  soundUrl?: string;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  autoPlay?: boolean;
  sellerName?: string;
}

export const AudioManager = ({ 
  soundUrl, 
  onEnded, 
  onDurationChange, 
  autoPlay = false,
  sellerName 
}: AudioManagerProps) => {
  const [showActivationButton, setShowActivationButton] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 AudioContext initialized');
      } catch (error) {
        console.error('❌ Failed to initialize AudioContext:', error);
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('🎵 AudioContext resumed');
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
      }
    }
  };

  useEffect(() => {
    if (!soundUrl || !audioRef.current) return;

    const audio = audioRef.current;
    let isCurrentEffect = true;
    
    console.log('🔊 Setting up audio for:', sellerName, 'URL:', soundUrl);
    
    const handleLoadedMetadata = () => {
      if (!isCurrentEffect) return;
      
      console.log('✅ Audio metadata loaded, duration:', audio.duration);
      
      // Always reset to start and report duration
      audio.currentTime = 0;
      const duration = audio.duration;
      if (duration && isFinite(duration)) {
        onDurationChange?.(duration);
      }
      
      // Auto-play after metadata is loaded
      if (autoPlay) {
        attemptPlay();
      }
    };

    const handleCanPlayThrough = () => {
      if (!isCurrentEffect) return;
      console.log('✅ Audio can play through');
      // Ensure we're at the beginning and try to play
      audio.currentTime = 0;
      if (autoPlay && soundEnabled) {
        attemptPlay();
      }
    };

    const handleEnded = () => {
      if (!isCurrentEffect) return;
      console.log('🎵 Audio playback ended');
      setShowActivationButton(false);
      setAudioError(null);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      if (!isCurrentEffect) return;
      console.error('❌ Audio error:', e);
      setAudioError('Ljudfilen kunde inte laddas');
      setTimeout(() => onEnded?.(), 100);
    };

    const handlePlay = () => {
      if (!isCurrentEffect) return;
      console.log('▶️ Audio started playing');
      setShowActivationButton(false);
      setAudioError(null);
    };

    const handlePause = () => {
      if (!isCurrentEffect) return;
      console.log('⏸️ Audio paused');
    };

    const attemptPlay = async () => {
      if (!audio || !isCurrentEffect) return;
      
      try {
        console.log('🎯 Attempting to play audio...');
        
        // Ensure we start from the beginning
        audio.currentTime = 0;
        
        // Initialize AudioContext if needed
        await initializeAudioContext();
        
        // Wait a bit to ensure audio is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('✅ Audio play successful');
          if (isCurrentEffect) {
            setShowActivationButton(false);
            setAudioError(null);
            setSoundEnabled(true);
          }
        }
      } catch (error: any) {
        if (!isCurrentEffect) return;
        
        console.error('❌ Audio play failed:', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          setShowActivationButton(true);
          setAudioError('Klicka för att aktivera ljud');
          console.log('🔇 Autoplay blocked - showing activation button');
        } else {
          setAudioError('Ljudfel - fortsätter utan ljud');
          console.error('❌ Audio playback error:', error);
          setTimeout(() => onEnded?.(), 100);
        }
      }
    };

    // Reset audio state and configure properly
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0; // Full volume
    audio.muted = false; // Ensure not muted
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous'; // Handle CORS
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Load audio - use the URL as provided (should already have cache busting)
    audio.src = soundUrl;
    audio.load();
    
    console.log('🎵 Audio element configured and loading:', soundUrl);

    return () => {
      isCurrentEffect = false;
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.currentTime = 0;
      console.log('🧹 Audio cleanup completed');
    };
  }, [soundUrl, onEnded, onDurationChange, autoPlay, sellerName, soundEnabled]);

  const handleUserActivation = async () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    try {
      console.log('👆 User activated audio');
      
      // Initialize AudioContext
      await initializeAudioContext();
      
      // Enable sound globally
      setSoundEnabled(true);
      
      // Ensure we start from the beginning
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ User-activated audio play successful');
      }
      
      setShowActivationButton(false);
      setAudioError(null);
    } catch (error) {
      console.error('❌ User-activated audio play failed:', error);
      setAudioError('Kan inte spela ljud');
      setTimeout(() => onEnded?.(), 100);
    }
  };

  if (!soundUrl) return null;

  return (
    <>
      <audio 
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
      />
      
      {/* User activation button */}
      {showActivationButton && (
        <div className="fixed top-4 right-4 z-[10000] bg-white rounded-lg shadow-lg p-4 border-2 border-blue-500">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-semibold text-sm">Aktivera ljud</p>
              <p className="text-xs text-gray-600">För bästa upplevelse</p>
            </div>
            <Button
              onClick={handleUserActivation}
              size="sm"
              className="ml-2"
            >
              Aktivera
            </Button>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {audioError && !showActivationButton && (
        <div className="fixed bottom-4 right-4 z-[10000] bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            <span className="text-sm">{audioError}</span>
          </div>
        </div>
      )}
    </>
  );
};