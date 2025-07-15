-- Kontrollera och uppdatera Storage policies för seller-sounds bucket
-- Säkerställ att ljudfiler kan spelas upp publikt

-- Skapa policy för SELECT på storage.objects för seller-sounds bucket
CREATE POLICY "Allow public read access to seller sounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-sounds');

-- Säkerställ att CORS är korrekt konfigurerat genom att verifiera bucket-inställningar
UPDATE storage.buckets 
SET public = true 
WHERE id = 'seller-sounds';