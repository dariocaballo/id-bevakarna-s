-- Säkerställ att seller-profiles bucket tillåter offentlig läsning av bilder

-- Skapa policy för SELECT på storage.objects för seller-profiles bucket  
CREATE POLICY "Allow public read access to seller profiles" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-profiles');

-- Säkerställ att bucket är publikt
UPDATE storage.buckets 
SET public = true 
WHERE id = 'seller-profiles';