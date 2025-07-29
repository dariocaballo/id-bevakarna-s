-- Enable realtime for sales table
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Add sales table to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- Also ensure other tables are enabled for realtime
ALTER TABLE public.sellers REPLICA IDENTITY FULL;
ALTER TABLE public.dashboard_settings REPLICA IDENTITY FULL; 
ALTER TABLE public.daily_challenges REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sellers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;

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