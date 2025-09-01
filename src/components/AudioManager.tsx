import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { getVersionedUrl } from '@/utils/media';

interface AudioManagerProps {
  soundUrl?: string;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  onStarted?: () => void;
  autoPlay?: boolean;
  sellerName?: string;
}

export const AudioManager = ({ 
  soundUrl, 
  onEnded, 
  onDurationChange, 
  onStarted,
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
      } catch (error) {
        // AudioContext initialization failed
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        // AudioContext resume failed
      }
    }
  };

  useEffect(() => {
    if (!soundUrl || !audioRef.current) return;

    const audio = audioRef.current;
    let isCurrentEffect = true;
    
    // Setting up audio for seller
    
    const handleLoadedMetadata = () => {
      if (!isCurrentEffect) return;
      
      // Audio metadata loaded
      
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
      // Ensure we're at the beginning and try to play
      audio.currentTime = 0;
      if (autoPlay && soundEnabled) {
        attemptPlay();
      }
    };

    const handleEnded = () => {
      if (!isCurrentEffect) return;
      setShowActivationButton(false);
      setAudioError(null);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      if (!isCurrentEffect) return;
      setAudioError('Ljudfilen kunde inte laddas');
      setTimeout(() => onEnded?.(), 100);
    };

    const handlePlay = () => {
      if (!isCurrentEffect) return;
      setShowActivationButton(false);
      setAudioError(null);
      onStarted?.();
    };

    const handlePause = () => {
      if (!isCurrentEffect) return;
      // Audio paused - no action needed
    };

    const attemptPlay = async () => {
      if (!audio || !isCurrentEffect) return;
      
      try {
        // Ensure we start from the beginning
        audio.currentTime = 0;
        
        // Initialize AudioContext if needed
        await initializeAudioContext();
        
        // Wait a bit to ensure audio is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (isCurrentEffect) {
            setShowActivationButton(false);
            setAudioError(null);
            setSoundEnabled(true);
          }
        }
      } catch (error: any) {
        if (!isCurrentEffect) return;
        
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          setShowActivationButton(true);
          setAudioError('Klicka för att aktivera ljud');
        } else {
          setAudioError('Ljudfel - fortsätter utan ljud');
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

    // Load audio - create versioned URL for cache busting
    const versionedUrl = soundUrl.includes('?v=') ? soundUrl : `${soundUrl}?v=${Date.now()}`;
    audio.src = versionedUrl;
    audio.load();

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
    };
  }, [soundUrl, onEnded, onDurationChange, onStarted, autoPlay, sellerName, soundEnabled]);

  const handleUserActivation = async () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    try {
      // Initialize AudioContext
      await initializeAudioContext();
      
      // Enable sound globally
      setSoundEnabled(true);
      
      // Ensure we start from the beginning
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      setShowActivationButton(false);
      setAudioError(null);
    } catch (error) {
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
      
      {/* User activation button - show prominently */}
      {showActivationButton && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border-4 border-blue-500 animate-pulse">
            <div className="mb-6">
              <Volume2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Aktivera ljud</h2>
              <p className="text-gray-600">För att spela upp ljud när en försäljning rapporteras</p>
              <p className="text-sm text-blue-600 mt-2">Krävs för att fira säljframgångar! 🎉</p>
            </div>
            <Button
              onClick={handleUserActivation}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
            >
              ▶️ Aktivera ljud
            </Button>
          </div>
        </div>
      )}
      
      {/* Error display - only show critical errors */}
      {audioError && !showActivationButton && (
        <div className="fixed bottom-4 right-4 z-[10000] bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded shadow-lg">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            <span className="text-sm font-medium">{audioError}</span>
          </div>
        </div>
      )}
    </>
  );
};