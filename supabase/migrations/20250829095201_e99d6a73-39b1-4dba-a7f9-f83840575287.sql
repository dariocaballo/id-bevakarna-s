-- Fix sales deletion RLS policy to allow public deletion for immediate usage
-- This allows anyone to delete sales records for operational needs
DROP POLICY IF EXISTS "Only admin can delete sales" ON public.sales;
CREATE POLICY "Anyone can delete sales"
ON public.sales 
FOR DELETE 
USING (true);

-- Also fix the update policy for consistency
DROP POLICY IF EXISTS "Only admin can update/delete sales" ON public.sales;
CREATE POLICY "Anyone can update sales"
ON public.sales 
FOR UPDATE 
USING (true);