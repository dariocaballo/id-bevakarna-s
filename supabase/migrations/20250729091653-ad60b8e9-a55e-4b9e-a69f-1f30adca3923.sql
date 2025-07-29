-- Fix RLS policies to allow anon user (without authentication)
DROP POLICY IF EXISTS "Only admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Only admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Only admins can delete sales" ON public.sales;

-- Create new policies that allow any user to insert sales
CREATE POLICY "Anyone can insert sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sales" 
ON public.sales 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete sales" 
ON public.sales 
FOR DELETE 
USING (true);