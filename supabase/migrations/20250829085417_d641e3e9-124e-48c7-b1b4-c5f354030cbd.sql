-- Remove El Clásico functionality - drop sales_count column
ALTER TABLE public.sales DROP COLUMN IF EXISTS sales_count;

-- Remove monthly_goal from sellers table if it exists
ALTER TABLE public.sellers DROP COLUMN IF EXISTS monthly_goal;