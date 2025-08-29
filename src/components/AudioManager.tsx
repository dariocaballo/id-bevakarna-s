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
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const attemptCountRef = useRef(0);

  useEffect(() => {
    if (!soundUrl || !audioRef.current) return;

    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (duration && isFinite(duration)) {
        console.log(`🎵 Audio loaded for ${sellerName}, duration: ${duration}s`);
        onDurationChange?.(duration);
      }
    };

    const handleCanPlay = async () => {
      console.log(`🎵 Audio can play for ${sellerName}`);
      if (autoPlay) {
        await attemptPlay();
      }
    };

    const handleEnded = () => {
      console.log(`🎵 Audio playback ended for ${sellerName}`);
      setShowActivationButton(false);
      onEnded?.();
    };

    const handleError = (e: Event) => {
      console.error('🎵 Audio error:', e);
      setAudioError('Ljudfilen kunde inte laddas');
      onEnded?.();
    };

    const attemptPlay = async () => {
      if (!audio) return;
      
      attemptCountRef.current++;
      console.log(`🎵 Attempting to play audio for ${sellerName} (attempt ${attemptCountRef.current})`);
      
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log(`✅ Audio started playing successfully for ${sellerName}`);
          setShowActivationButton(false);
          setAudioError(null);
        }
      } catch (error: any) {
        console.warn(`⚠️ Autoplay failed for ${sellerName}:`, error.message);
        
        if (error.name === 'NotAllowedError') {
          setShowActivationButton(true);
          setAudioError('Klicka för att aktivera ljud');
        } else {
          setAudioError('Ljudfel - fortsätter utan ljud');
          // Still call onEnded to proceed with confetti
          setTimeout(() => onEnded?.(), 100);
        }
      }
    };

    // Reset audio for each new sound
    audio.currentTime = 0;
    audio.volume = 0.8; // Set reasonable volume
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load the audio
    audio.src = soundUrl;
    audio.preload = 'auto';
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [soundUrl, onEnded, onDurationChange, autoPlay, sellerName]);

  const handleUserActivation = async () => {
    if (!audioRef.current) return;
    
    setUserHasInteracted(true);
    const audio = audioRef.current;
    
    try {
      await audio.play();
      setShowActivationButton(false);
      setAudioError(null);
      console.log('✅ User-activated audio playback started');
    } catch (error) {
      console.error('❌ User-activated playback failed:', error);
      setAudioError('Kan inte spela ljud');
      onEnded?.();
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
      
      {/* User activation button for autoplay policy */}
      {showActivationButton && (
        <div className="fixed top-4 right-4 z-[10000] bg-white rounded-lg shadow-lg p-4 border-2 border-primary">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-primary" />
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