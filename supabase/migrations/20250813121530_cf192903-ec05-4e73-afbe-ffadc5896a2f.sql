-- Fix critical security vulnerability in sales table RLS policies
-- Current policies allow anyone to insert, update, delete sales without authentication

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can delete sales" ON public.sales;

-- Create secure RLS policies for sales table
-- Only authenticated users can insert sales (create new sales records)
CREATE POLICY "Authenticated users can insert sales" 
ON public.sales 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update sales (modify existing sales records)
CREATE POLICY "Only admins can update sales" 
ON public.sales 
FOR UPDATE 
TO authenticated
USING (is_admin());

-- Only admins can delete sales (remove sales records)
CREATE POLICY "Only admins can delete sales" 
ON public.sales 
FOR DELETE 
TO authenticated
USING (is_admin());

-- Keep the existing SELECT policy (everyone can view sales)
-- This allows the public dashboard to display sales data