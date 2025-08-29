export const playApplauseSound = () => {
  try {
    // Create applause sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create multiple noise bursts to simulate applause
    const duration = 2.5; // 2.5 seconds
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate); // Stereo
    
    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      
      // Generate bursts of noise to simulate clapping
      for (let i = 0; i < bufferSize; i++) {
        const time = i / audioContext.sampleRate;
        const burstFreq = 8 + Math.sin(time * 2) * 4; // Variable burst frequency
        const burstPattern = Math.sin(time * burstFreq * Math.PI);
        const envelope = Math.exp(-time * 1.5) * (1 + Math.sin(time * 20) * 0.3);
        
        // Add randomness for applause texture
        const noise = (Math.random() * 2 - 1) * 0.7;
        output[i] = noise * burstPattern * envelope * (0.8 + Math.random() * 0.4);
      }
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Apply filtering for more realistic applause
    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(200, audioContext.currentTime);
    
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4000, audioContext.currentTime);
    
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
    compressor.knee.setValueAtTime(30, audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    
    // Connect the audio chain
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(audioContext.currentTime);
    source.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('Audio context not available, using fallback applause');
    // Enhanced fallback applause sound using multiple overlapping audio instances
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const audio = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAB7fHt8e3x7fHt8fHx8fHt8e3x8fHx7fHt8e3x7fHt8');
        audio.volume = 0.1 + Math.random() * 0.1;
        audio.playbackRate = 0.8 + Math.random() * 0.4;
        audio.play().catch(() => {});
      }, i * 100);
    }
  }
};