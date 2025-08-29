-- Ensure seller-sounds bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('seller-sounds', 'seller-sounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure seller-profiles bucket exists and is public  
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-profiles', 'seller-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for seller-sounds bucket
DROP POLICY IF EXISTS "Anyone can view seller sounds" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload seller sounds" ON storage.objects;  
DROP POLICY IF EXISTS "Anyone can update seller sounds" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete seller sounds" ON storage.objects;

CREATE POLICY "Anyone can view seller sounds" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can upload seller sounds" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can update seller sounds" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can delete seller sounds" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'seller-sounds');

-- Storage policies for seller-profiles bucket
DROP POLICY IF EXISTS "Anyone can view seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update seller profiles" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete seller profiles" ON storage.objects;

CREATE POLICY "Anyone can view seller profiles" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can upload seller profiles" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can update seller profiles" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can delete seller profiles" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'seller-profiles');