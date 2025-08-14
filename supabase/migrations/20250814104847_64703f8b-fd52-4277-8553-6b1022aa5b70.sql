-- Fix critical security vulnerability: Restrict sales data access to authenticated users only
-- This replaces the overly permissive "Everyone can view sales" policy

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Everyone can view sales" ON public.sales;

-- Create a new restrictive policy that only allows authenticated users to view sales
CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Also ensure the dashboard_settings table follows the same pattern for consistency
-- (though it already has proper admin-only policies)

-- Add a comment for documentation
COMMENT ON POLICY "Authenticated users can view sales" ON public.sales IS 
'Restricts sales data access to authenticated users only to protect sensitive business information from competitors and unauthorized access';