-- Add service_type column to sales table for SSTNET vs ID-Bevakarna tracking
ALTER TABLE sales ADD COLUMN service_type TEXT DEFAULT 'sstnet';

-- Update existing sales to have default service_type
UPDATE sales SET service_type = 'sstnet' WHERE service_type IS NULL;