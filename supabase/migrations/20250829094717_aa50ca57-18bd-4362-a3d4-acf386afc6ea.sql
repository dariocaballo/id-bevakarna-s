-- Fix seller profile image URLs to match actual storage files
-- Update Daniel's profile image URL
UPDATE sellers 
SET profile_image_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/615216f9-b800-4c5e-b6b5-0f6ea07242ff.png'
WHERE id = '615216f9-b800-4c5e-b6b5-0f6ea07242ff' AND name = 'Daniel';

-- Update Robin's profile image URL (found PNG file in storage)
UPDATE sellers 
SET profile_image_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/f3b91cca-1845-4f1c-97c8-1d1274759abd.PNG'
WHERE id = 'f3b91cca-1845-4f1c-97c8-1d1274759abd' AND name = 'Robin';

-- Update sound file URLs to use lowercase extensions for consistency
UPDATE sellers 
SET sound_file_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/615216f9-b800-4c5e-b6b5-0f6ea07242ff.mp3'
WHERE id = '615216f9-b800-4c5e-b6b5-0f6ea07242ff' AND name = 'Daniel';

UPDATE sellers 
SET sound_file_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/ea7f24e7-e8eb-4914-8471-03b093a128cb.mp3'
WHERE id = 'ea7f24e7-e8eb-4914-8471-03b093a128cb' AND name = 'Hellos';

UPDATE sellers 
SET sound_file_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/c393e48b-96bd-48f8-83e4-8ca2da645395.mp3'
WHERE id = 'c393e48b-96bd-48f8-83e4-8ca2da645395' AND name = 'Mommo';

UPDATE sellers 
SET sound_file_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/f3b91cca-1845-4f1c-97c8-1d1274759abd.mp3'
WHERE id = 'f3b91cca-1845-4f1c-97c8-1d1274759abd' AND name = 'Robin';

UPDATE sellers 
SET sound_file_url = 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/311bd5ef-ae80-4d0c-a312-2cb1969580cc.mp3'
WHERE id = '311bd5ef-ae80-4d0c-a312-2cb1969580cc' AND name = 'Tomas';