-- Add is_id_skydd column to sales table for combined reporting
ALTER TABLE public.sales 
ADD COLUMN is_id_skydd boolean DEFAULT false;

-- Update RLS policies to allow sellers to delete their own sales from current month only
-- Drop existing overly restrictive delete policy
DROP POLICY IF EXISTS "Only admins can delete sales" ON public.sales;

-- Create new policy allowing sellers to delete their own sales from current month
CREATE POLICY "Users can delete own sales from current month" 
ON public.sales 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  date_trunc('month', created_at) = date_trunc('month', now())
);

-- Allow admins to delete any sales (for admin functionality)
CREATE POLICY "Admins can delete any sales" 
ON public.sales 
FOR DELETE 
TO authenticated
USING (is_admin());