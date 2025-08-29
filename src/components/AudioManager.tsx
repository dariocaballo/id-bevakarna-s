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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!soundUrl || !audioRef.current) return;

    const audio = audioRef.current;
    let isCurrentEffect = true;
    
    const handleLoadedMetadata = () => {
      if (!isCurrentEffect) return;
      
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
      // Ensure we're at the beginning
      audio.currentTime = 0;
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

    const attemptPlay = async () => {
      if (!audio || !isCurrentEffect) return;
      
      try {
        // Ensure we start from the beginning
        audio.currentTime = 0;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setShowActivationButton(false);
          setAudioError(null);
        }
      } catch (error: any) {
        if (!isCurrentEffect) return;
        
        if (error.name === 'NotAllowedError') {
          setShowActivationButton(true);
          setAudioError('Klicka för att aktivera ljud');
        } else {
          setAudioError('Ljudfel - fortsätter utan ljud');
          setTimeout(() => onEnded?.(), 100);
        }
      }
    };

    // Reset audio state
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.preload = 'metadata';
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load audio - use original URL with existing cache busting
    audio.src = soundUrl;
    audio.load();

    return () => {
      isCurrentEffect = false;
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [soundUrl, onEnded, onDurationChange, autoPlay]);

  const handleUserActivation = async () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    try {
      // Ensure we start from the beginning
      audio.currentTime = 0;
      await audio.play();
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