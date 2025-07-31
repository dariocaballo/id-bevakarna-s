-- Add new columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'sstnet',
ADD COLUMN IF NOT EXISTS tb_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 0;

-- Update existing records to use tb_amount instead of amount for sstnet
UPDATE public.sales 
SET tb_amount = amount, service_type = 'sstnet' 
WHERE service_type IS NULL OR service_type = 'sstnet';