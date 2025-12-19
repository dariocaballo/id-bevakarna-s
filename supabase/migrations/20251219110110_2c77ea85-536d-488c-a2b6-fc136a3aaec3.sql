-- Drop existing foreign key and recreate with ON DELETE SET NULL
-- This allows sellers to be deleted even if they have historical sales

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_seller_id_fkey;

ALTER TABLE public.sales 
ADD CONSTRAINT sales_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.sellers(id) 
ON DELETE SET NULL;