import React, { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showActivation, setShowActivation] = React.useState(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // Handle audio end - call onEnded only once
  const handleEnded = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    console.log('🔇 Audio ended, calling onEnded');
    setShowActivation(false);
    onEnded?.();
  }, [onEnded]);

  // Main audio setup effect
  useEffect(() => {
    if (!soundUrl) {
      console.log('⚠️ No sound URL provided');
      return;
    }

    console.log(`🔊 AudioManager: Setting up audio for ${sellerName}`, soundUrl);
    
    hasStartedRef.current = false;
    hasEndedRef.current = false;
    setShowActivation(false);

    // Create audio element
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'auto';
    audio.volume = 1.0;

    // Event handlers
    const onLoadedMetadata = () => {
      console.log(`🎵 Audio loaded, duration: ${audio.duration}s`);
      if (audio.duration && isFinite(audio.duration)) {
        onDurationChange?.(audio.duration);
      }
    };

    const onCanPlayThrough = () => {
      console.log('✅ Audio can play through');
      if (autoPlay && !hasStartedRef.current) {
        attemptPlay();
      }
    };

    const onPlay = () => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        console.log('▶️ Audio started playing');
        setShowActivation(false);
        onStarted?.();
      }
    };

    const onAudioEnded = () => {
      console.log('🔇 Audio ended event');
      handleEnded();
    };

    const onError = (e: Event) => {
      console.error('❌ Audio error:', e);
      handleEnded();
    };

    const attemptPlay = async () => {
      if (hasStartedRef.current || hasEndedRef.current) return;
      
      try {
        console.log('🎵 Attempting to play audio...');
        await audio.play();
        console.log('✅ Audio playing successfully');
      } catch (error: any) {
        console.log('⚠️ Audio play failed:', error.name);
        
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          // Browser requires user interaction
          setShowActivation(true);
          
          // Timeout - skip audio after 8 seconds if not activated
          activationTimeoutRef.current = setTimeout(() => {
            console.log('⏱️ Audio activation timeout');
            handleEnded();
          }, 8000);
        } else {
          // Other error - skip audio
          handleEnded();
        }
      }
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onAudioEnded);
    audio.addEventListener('error', onError);

    // Load audio with cache busting
    const versionedUrl = soundUrl.includes('?') ? soundUrl : `${soundUrl}?v=${Date.now()}`;
    audio.src = versionedUrl;
    audio.load();

    // Cleanup on unmount or soundUrl change
    return () => {
      console.log('🧹 AudioManager cleanup');
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onAudioEnded);
      audio.removeEventListener('error', onError);
      cleanup();
    };
  }, [soundUrl, autoPlay, sellerName, onDurationChange, onStarted, handleEnded, cleanup]);

  // Handle user activation click
  const handleActivationClick = async () => {
    if (!audioRef.current || hasEndedRef.current) return;
    
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    
    try {
      console.log('👆 User activated audio');
      await audioRef.current.play();
      setShowActivation(false);
    } catch (error) {
      console.error('❌ User activation failed:', error);
      handleEnded();
    }
  };

  if (!soundUrl) return null;

  return (
    <>
      {showActivation && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border-4 border-blue-500 animate-pulse">
            <div className="mb-6">
              <Volume2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Aktivera ljud</h2>
              <p className="text-gray-600">Klicka för att spela upp firande-ljud</p>
              {sellerName && (
                <p className="text-sm text-blue-600 mt-2">🎉 {sellerName} har gjort en sälj!</p>
              )}
            </div>
            <Button
              onClick={handleActivationClick}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
            >
              ▶️ Spela ljud
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
