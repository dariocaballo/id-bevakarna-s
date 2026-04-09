import { useEffect, useRef, useCallback } from 'react';

interface AudioManagerProps {
  soundUrl?: string;
  onEnded?: () => void;
  onStarted?: () => void;
  autoPlay?: boolean;
  sellerName?: string;
}

export const AudioManager = ({ 
  soundUrl, 
  onEnded, 
  onStarted,
  autoPlay = false,
  sellerName 
}: AudioManagerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);

  const handleEnded = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    console.log('🔇 Audio ended for', sellerName);
    onEnded?.();
  }, [onEnded, sellerName]);

  useEffect(() => {
    if (!soundUrl) {
      console.log('⚠️ No sound URL provided');
      return;
    }

    console.log(`🔊 AudioManager: Setting up audio for ${sellerName}`, soundUrl);
    
    hasStartedRef.current = false;
    hasEndedRef.current = false;

    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'auto';
    audio.volume = 1.0;

    const onPlay = () => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        console.log('▶️ Audio started playing for', sellerName);
        onStarted?.();
      }
    };

    const onAudioEnded = () => {
      handleEnded();
    };

    const onError = (e: Event) => {
      console.error('❌ Audio error:', e);
      handleEnded();
    };

    // Safety timeout: if audio hasn't ended after 60s, force end
    const safetyTimeout = setTimeout(() => {
      console.log('⏱️ Audio safety timeout for', sellerName);
      handleEnded();
    }, 60000);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onAudioEnded);
    audio.addEventListener('error', onError);

    // Load and attempt to play
    const versionedUrl = soundUrl.includes('?') ? soundUrl : `${soundUrl}?v=${Date.now()}`;
    audio.src = versionedUrl;
    audio.load();

    if (autoPlay) {
      // Wait for canplaythrough, then play
      const onCanPlay = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        if (hasEndedRef.current) return;
        
        audio.play().then(() => {
          console.log('✅ Audio playing for', sellerName);
        }).catch((error) => {
          console.warn('⚠️ Audio play blocked:', error.name);
          // Audio blocked by browser policy - skip gracefully
          // The dashboard-level unlock should have prevented this
          handleEnded();
        });
      };
      audio.addEventListener('canplaythrough', onCanPlay);
    }

    return () => {
      console.log('🧹 AudioManager cleanup for', sellerName);
      clearTimeout(safetyTimeout);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onAudioEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [soundUrl, autoPlay, sellerName, onStarted, handleEnded]);

  return null;
};
