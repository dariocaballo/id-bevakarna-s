-- Fix RLS policies for sellers table to ensure admin operations work properly

-- First, ensure sellers table has proper RLS enabled
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Everyone can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admin can manage sellers" ON public.sellers;

-- Create comprehensive policies for sellers table
CREATE POLICY "Everyone can view sellers" 
ON public.sellers 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert sellers" 
ON public.sellers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update sellers" 
ON public.sellers 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can delete sellers" 
ON public.sellers 
FOR DELETE 
USING (true);

-- Ensure storage policies exist and are correct
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('seller-profiles', 'seller-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('seller-sounds', 'seller-sounds', true, 10485760, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop and recreate storage policies to ensure they work
DROP POLICY IF EXISTS "Public read seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Public insert seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Public update seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Public delete seller profiles" ON storage.objects;

DROP POLICY IF EXISTS "Public read seller sounds" ON storage.objects;
DROP POLICY IF EXISTS "Public insert seller sounds" ON storage.objects;
DROP POLICY IF EXISTS "Public update seller sounds" ON storage.objects;
DROP POLICY IF EXISTS "Public delete seller sounds" ON storage.objects;

-- Create storage policies for seller-profiles
CREATE POLICY "Public read seller profiles" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Public insert seller profiles" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Public update seller profiles" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-profiles')
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Public delete seller profiles" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-profiles');

-- Create storage policies for seller-sounds
CREATE POLICY "Public read seller sounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Public insert seller sounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "Public update seller sounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-sounds')
WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "Public delete seller sounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-sounds');