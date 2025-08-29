import { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  soundUrl?: string;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  autoPlay?: boolean;
}

export const AudioPlayer = ({ soundUrl, onEnded, onDurationChange, autoPlay = false }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!soundUrl || !audioRef.current) return;

    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (duration && isFinite(duration)) {
        console.log(`🎵 Audio loaded, duration: ${duration}s`);
        onDurationChange?.(duration);
      }
    };

    const handleCanPlay = () => {
      console.log('🎵 Audio can play');
      if (autoPlay) {
        playAudio();
      }
    };

    const handleEnded = () => {
      console.log('🎵 Audio playback ended');
      onEnded?.();
    };

    const handleError = (e: Event) => {
      console.error('🎵 Audio error:', e);
      // Call onEnded even on error to clean up
      onEnded?.();
    };

    const playAudio = async () => {
      try {
        console.log('🎵 Attempting to play audio:', soundUrl);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🎵 Audio started playing successfully');
        }
      } catch (error) {
        console.error('🎵 Failed to play audio:', error);
        // Still call onEnded to clean up the celebration
        onEnded?.();
      }
    };

    // Reset audio for each new sound
    audio.currentTime = 0;
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load the audio with cache busting
    const cacheBustedUrl = soundUrl.includes('?') ? `${soundUrl}&t=${Date.now()}` : `${soundUrl}?t=${Date.now()}`;
    audio.src = cacheBustedUrl;
    audio.preload = 'auto';
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      // Pause and reset audio on cleanup
      audio.pause();
      audio.currentTime = 0;
    };
  }, [soundUrl, onEnded, onDurationChange, autoPlay]);

  if (!soundUrl) return null;

  return (
    <audio 
      ref={audioRef}
      preload="auto"
      style={{ display: 'none' }}
    />
  );
};