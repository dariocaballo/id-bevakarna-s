-- Ensure storage buckets have proper CORS policies for audio playback
-- Update seller-sounds bucket policies to allow proper CORS for audio

-- Drop existing policies first
DROP POLICY IF EXISTS "sounds_select" ON storage.objects;
DROP POLICY IF EXISTS "sounds_insert" ON storage.objects;
DROP POLICY IF EXISTS "sounds_update" ON storage.objects;
DROP POLICY IF EXISTS "sounds_delete" ON storage.objects;
DROP POLICY IF EXISTS "profiles_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete" ON storage.objects;

-- Create comprehensive storage policies for seller-sounds with proper CORS support
CREATE POLICY "Public can view seller sounds" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Public can insert seller sounds" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "Public can update seller sounds" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Public can delete seller sounds" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'seller-sounds');

-- Create comprehensive storage policies for seller-profiles
CREATE POLICY "Public can view seller profiles" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Public can insert seller profiles" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Public can update seller profiles" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Public can delete seller profiles" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'seller-profiles');