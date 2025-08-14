-- Fix critical security vulnerability: Restrict sales data access to authenticated users only
-- First check and remove the overly permissive "Everyone can view sales" policy

-- Drop the existing overly permissive policy (use IF EXISTS to be safe)
DROP POLICY IF EXISTS "Everyone can view sales" ON public.sales;

-- Drop any existing "Authenticated users can view sales" policy to recreate it properly
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;

-- Create the secure policy that only allows authenticated users to view sales
CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Verify no public access remains by ensuring only authenticated users can access
-- This protects sensitive business data from competitors and unauthorized access