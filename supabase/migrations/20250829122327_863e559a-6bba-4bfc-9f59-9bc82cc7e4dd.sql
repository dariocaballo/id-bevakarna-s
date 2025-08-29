-- Fix RLS policies for open app (no authentication required)

-- SELLERS TABLE - Allow public access for all operations
DROP POLICY IF EXISTS "Everyone can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admin can manage sellers" ON public.sellers;

-- Create new public policies for sellers
CREATE POLICY "sellers_select" ON public.sellers
  FOR SELECT TO public USING (true);

CREATE POLICY "sellers_insert" ON public.sellers
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "sellers_update" ON public.sellers
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "sellers_delete" ON public.sellers
  FOR DELETE TO public USING (true);

-- STORAGE POLICIES - seller-profiles bucket
DROP POLICY IF EXISTS "profiles_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update" ON storage.objects; 
DROP POLICY IF EXISTS "profiles_delete" ON storage.objects;

-- Create new public storage policies for seller-profiles
CREATE POLICY "profiles_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'seller-profiles');

CREATE POLICY "profiles_insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "profiles_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'seller-profiles');

CREATE POLICY "profiles_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'seller-profiles');

-- STORAGE POLICIES - seller-sounds bucket
DROP POLICY IF EXISTS "sounds_select" ON storage.objects;
DROP POLICY IF EXISTS "sounds_insert" ON storage.objects;
DROP POLICY IF EXISTS "sounds_update" ON storage.objects;
DROP POLICY IF EXISTS "sounds_delete" ON storage.objects;

-- Create new public storage policies for seller-sounds
CREATE POLICY "sounds_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'seller-sounds');

CREATE POLICY "sounds_insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "sounds_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'seller-sounds');

CREATE POLICY "sounds_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'seller-sounds');