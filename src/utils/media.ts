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
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list('');

    if (listError) {
      throw listError;
    }

    if (existingFiles) {
      const filesToRemove = existingFiles
        .filter(f => f.name.startsWith(sellerId))
        .map(f => f.name);
      
      if (filesToRemove.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(bucketName)
          .remove(filesToRemove);
        
        if (removeError) {
          // Don't throw here, continue with upload
        }
      }
    }

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || (bucketName.includes('sound') ? 'mp3' : 'jpg');
    const fileName = `${sellerId}-${timestamp}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, { 
        upsert: false,
        contentType: file.type || (bucketName.includes('sound') ? 'audio/mpeg' : 'image/jpeg')
      });

    if (uploadError) {
      throw uploadError;
    }

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
 * Update seller media URLs in database with proper conflict resolution
 */
export async function updateSellerMedia(
  sellerId: string, 
  updates: { profile_image_url?: string | null; sound_file_url?: string | null }
): Promise<{ error?: string; data?: any }> {
  try {
    const updateTime = new Date().toISOString();
    
    // First verify seller exists
    const { data: existingSeller, error: checkError } = await supabase
      .from('sellers')
      .select('id, name')
      .eq('id', sellerId)
      .maybeSingle();
    
    if (checkError) {
      throw new Error(`Kunde inte kontrollera säljare: ${checkError.message}`);
    }
    
    if (!existingSeller) {
      throw new Error(`Säljare med ID ${sellerId} hittades inte`);
    }
    
    // Use UPSERT with proper conflict resolution to ensure atomicity
    const { data, error } = await supabase
      .from('sellers')
      .upsert({ 
        id: sellerId,
        name: existingSeller.name, // Preserve existing name
        ...updates,
        updated_at: updateTime
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Databasfel: ${error.message}`);
    }
    
    return { data };
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
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-mpeg'];
  const fileName = file.name.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
                     fileName.endsWith('.mp3') || 
                     fileName.endsWith('.wav') || 
                     fileName.endsWith('.ogg');
  
  if (!isValidType) {
    return { valid: false, error: `Ogiltigt filformat "${file.type}". Använd MP3, WAV eller OGG.` };
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
    audio.crossOrigin = 'anonymous';
    
    const onLoadedMetadata = () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.currentTime = 0;
      resolve(audio);
    };
    
    const onError = (e: any) => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      reject(new Error(`Failed to load audio: ${e.message || 'Unknown error'}`));
    };
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      reject(new Error('Audio loading timeout'));
    }, 10000);
    
    audio.addEventListener('loadedmetadata', () => clearTimeout(timeout));
    audio.addEventListener('error', () => clearTimeout(timeout));
    
    audio.load();
  });
}