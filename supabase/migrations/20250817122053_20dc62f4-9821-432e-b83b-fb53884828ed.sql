-- Allow public SELECT access to sales table for dashboard functionality
CREATE POLICY "Public can view sales for dashboard" 
ON public.sales 
FOR SELECT 
USING (true);