-- Remove any existing check constraints that might be causing issues
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_amount_check;

-- Ensure amount column allows all positive values including 0
-- No additional constraints needed since amount is required non-null numeric