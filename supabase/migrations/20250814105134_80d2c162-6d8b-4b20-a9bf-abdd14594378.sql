-- Fix realtime subscription issues by enabling realtime on tables
-- and adjusting RLS to allow dashboard functionality while keeping data secure

-- First, enable realtime for the sales table
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.sales;

-- Enable realtime for sellers table  
ALTER TABLE public.sellers REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.sellers;

-- Enable realtime for dashboard_settings table
ALTER TABLE public.dashboard_settings REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.dashboard_settings;

-- Enable realtime for daily_challenges table
ALTER TABLE public.daily_challenges REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.daily_challenges;

-- Fix the authentication issue: Allow public read access for dashboard display
-- but keep sensitive operations authenticated
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;

-- Create a more nuanced policy that allows public viewing but authenticated operations
CREATE POLICY "Public can view sales for dashboard" 
ON public.sales 
FOR SELECT 
USING (true);

-- Keep the insert policy requiring authentication
-- UPDATE: The existing insert policy "Authenticated users can insert sales" should work
-- but let's make sure it allows any authenticated user to insert

-- For development/testing, allow any authenticated user to insert
-- In production, you might want to restrict this further
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
CREATE POLICY "Authenticated users can insert sales" 
ON public.sales 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Comment for documentation
COMMENT ON POLICY "Public can view sales for dashboard" ON public.sales IS 
'Allows public read access for dashboard display while keeping write operations authenticated';

COMMENT ON POLICY "Authenticated users can insert sales" ON public.sales IS 
'Allows authenticated users to insert sales data';

-- Verify the sellers table also has proper public read access for dashboard
-- It should already have "Everyone can view sellers" policy