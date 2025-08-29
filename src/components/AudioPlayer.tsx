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
        await audio.play();
        console.log('🎵 Audio started playing');
      } catch (error) {
        console.error('🎵 Failed to play audio (likely autoplay restriction):', error);
        // Try without user interaction - fallback
        onEnded?.();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load the audio
    audio.src = soundUrl;
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
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