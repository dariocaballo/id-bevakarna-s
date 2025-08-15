-- Fix security warning: Set proper search_path for function
CREATE OR REPLACE FUNCTION public.assign_seller_to_user(seller_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
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