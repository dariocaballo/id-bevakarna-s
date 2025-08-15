-- Add user_id column to sellers table to link sellers with users
ALTER TABLE public.sellers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for sellers table to use user_id
DROP POLICY IF EXISTS "Only admins can insert sellers" ON public.sellers;
DROP POLICY IF EXISTS "Only admins can update sellers" ON public.sellers;
DROP POLICY IF EXISTS "Only admins can delete sellers" ON public.sellers;

-- Create new policies for sellers
CREATE POLICY "Admins can insert sellers" ON public.sellers
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins and seller owners can update sellers" ON public.sellers
FOR UPDATE USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can delete sellers" ON public.sellers
FOR DELETE USING (is_admin());

-- Update RLS policies for sales table
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete own sales from current month" ON public.sales;

-- Create better sales policies that check if user owns the seller
CREATE POLICY "Users can insert sales for their own seller" ON public.sales
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own sales from current month" ON public.sales
FOR DELETE USING (
  auth.uid() IS NOT NULL AND 
  date_trunc('month', created_at) = date_trunc('month', now()) AND
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE id = seller_id AND user_id = auth.uid()
  )
);

-- Create a function to assign sellers to users (for admin use)
CREATE OR REPLACE FUNCTION public.assign_seller_to_user(seller_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can assign sellers
  IF NOT is_admin() THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.sellers 
  SET user_id = target_user_id 
  WHERE id = seller_id;
  
  RETURN FOUND;
END;
$$;