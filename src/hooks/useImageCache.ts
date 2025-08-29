import { useState, useEffect, useCallback } from 'react';

interface ImageCache {
  [url: string]: {
    loaded: boolean;
    error: boolean;
    blob?: string;
  };
}

export const useImageCache = () => {
  const [imageCache, setImageCache] = useState<ImageCache>({});

  const preloadImage = useCallback((url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check if already cached
      if (imageCache[url]?.loaded && imageCache[url].blob) {
        resolve(imageCache[url].blob!);
        return;
      }

      // Set loading state
      setImageCache(prev => ({
        ...prev,
        [url]: { loaded: false, error: false }
      }));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Create canvas to convert to blob
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            setImageCache(prev => ({
              ...prev,
              [url]: { loaded: true, error: false, blob: blobUrl }
            }));
            resolve(blobUrl);
          } else {
            setImageCache(prev => ({
              ...prev,
              [url]: { loaded: false, error: true }
            }));
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => {
        console.error('❌ Failed to load image:', url);
        setImageCache(prev => ({
          ...prev,
          [url]: { loaded: false, error: true }
        }));
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }, [imageCache]);

  const preloadImages = useCallback(async (urls: string[]) => {
    console.log('🖼️ Preloading images:', urls.length);
    const validUrls = urls.filter(url => url && url.trim());
    
    const preloadPromises = validUrls.map(async (url) => {
      try {
        await preloadImage(url);
        console.log('✅ Image preloaded:', url);
      } catch (error) {
        console.error('❌ Failed to preload image:', url, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('🖼️ Image preloading complete');
  }, [preloadImage]);

  const getCachedImage = useCallback((url: string): string | null => {
    if (!url) return null;
    
    const cached = imageCache[url];
    if (cached?.loaded && cached.blob) {
      return cached.blob;
    }
    
    // If not cached, start preloading for next time
    if (!cached) {
      preloadImage(url).catch(() => {});
    }
    
    return url; // Return original URL as fallback
  }, [imageCache, preloadImage]);

  const isImageLoaded = useCallback((url: string): boolean => {
    return imageCache[url]?.loaded || false;
  }, [imageCache]);

  const hasImageError = useCallback((url: string): boolean => {
    return imageCache[url]?.error || false;
  }, [imageCache]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageCache).forEach(cached => {
        if (cached.blob) {
          URL.revokeObjectURL(cached.blob);
        }
      });
    };
  }, []);

  return {
    preloadImages,
    getCachedImage,
    isImageLoaded,
    hasImageError,
    preloadImage
  };
};