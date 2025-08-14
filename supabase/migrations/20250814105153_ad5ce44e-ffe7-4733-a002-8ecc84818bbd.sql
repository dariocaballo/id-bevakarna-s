-- Fix RLS policies to allow proper functionality while maintaining security

-- Fix the sales table policies
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Public can view sales for dashboard" ON public.sales;

-- Create a public read policy for dashboard functionality
CREATE POLICY "Public can view sales for dashboard" 
ON public.sales 
FOR SELECT 
USING (true);

-- Ensure insert policy allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
CREATE POLICY "Authenticated users can insert sales" 
ON public.sales 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Add delete policy for sellers to delete their own sales in current month
DROP POLICY IF EXISTS "Users can delete own sales from current month" ON public.sales;
CREATE POLICY "Users can delete own sales from current month" 
ON public.sales 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  date_trunc('month', created_at) = date_trunc('month', now())
);

-- Keep admin delete policy
-- (It should already exist from previous migration)