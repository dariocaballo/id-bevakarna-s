import { supabase } from '@/integrations/supabase/client';

export interface MediaUploadResult {
  publicUrl: string;
  error?: string;
}

/**
 * Get a versioned URL for cache busting
 */
export function getVersionedUrl(url: string | null | undefined, updatedAt?: string): string | null {
  if (!url) return null;
  
  const version = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

/**
 * Upload file to a Supabase storage bucket
 */
export async function uploadToBucket(
  bucketName: string, 
  file: File, 
  sellerId: string
): Promise<MediaUploadResult> {
  try {
    // Remove existing files for this seller
    const { data: existingFiles } = await supabase.storage
      .from(bucketName)
      .list('');

    if (existingFiles) {
      const filesToRemove = existingFiles
        .filter(f => f.name.startsWith(sellerId))
        .map(f => f.name);
      
      if (filesToRemove.length > 0) {
        await supabase.storage
          .from(bucketName)
          .remove(filesToRemove);
      }
    }

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${sellerId}-${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return { publicUrl };
  } catch (error) {
    return { 
      publicUrl: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Update seller media URLs in database
 */
export async function updateSellerMedia(
  sellerId: string, 
  updates: { profile_image_url?: string; sound_file_url?: string }
): Promise<{ error?: string }> {
  try {
    const updateTime = new Date().toISOString();
    
    const { error } = await supabase
      .from('sellers')
      .update({ 
        ...updates,
        updated_at: updateTime
      })
      .eq('id', sellerId);

    if (error) throw error;
    return {};
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Database update failed' 
    };
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const fileName = file.name.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
                     fileName.endsWith('.png') || 
                     fileName.endsWith('.jpg') || 
                     fileName.endsWith('.jpeg') || 
                     fileName.endsWith('.webp') ||
                     fileName.endsWith('.gif');
  
  if (!isValidType) {
    return { valid: false, error: 'Ogiltigt bildformat. Använd JPG, PNG, WebP eller GIF.' };
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return { valid: false, error: 'Bilden är för stor. Max 5MB tillåtet.' };
  }

  return { valid: true };
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
  const fileName = file.name.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
                     fileName.endsWith('.mp3') || 
                     fileName.endsWith('.wav') || 
                     fileName.endsWith('.ogg');
  
  if (!isValidType) {
    return { valid: false, error: 'Ogiltigt filformat. Använd MP3, WAV eller OGG.' };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { valid: false, error: 'Ljudfilen är för stor. Max 10MB tillåtet.' };
  }

  return { valid: true };
}

/**
 * Create and play audio with proper error handling
 */
export function createAudio(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.preload = 'auto';
    
    const onLoadedMetadata = () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.currentTime = 0;
      resolve(audio);
    };
    
    const onError = () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      reject(new Error('Failed to load audio'));
    };
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    
    audio.load();
  });
}