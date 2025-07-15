-- Fix multiple active layouts issue
-- First, set all layouts to inactive
UPDATE dashboard_layouts SET is_active = false;

-- Then activate only the most recent one
UPDATE dashboard_layouts 
SET is_active = true 
WHERE id = (
  SELECT id FROM dashboard_layouts 
  ORDER BY created_at DESC 
  LIMIT 1
);