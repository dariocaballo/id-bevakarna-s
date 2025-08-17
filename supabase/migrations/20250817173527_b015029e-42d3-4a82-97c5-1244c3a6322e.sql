-- Complete rebuild: Drop existing tables and recreate clean schema
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS sellers CASCADE;
DROP TABLE IF EXISTS daily_challenges CASCADE;
DROP TABLE IF EXISTS dashboard_layouts CASCADE;
DROP TABLE IF EXISTS dashboard_settings CASCADE;

-- Create sellers table
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  profile_image_url TEXT,
  sound_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table with simplified schema
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_name TEXT NOT NULL,
  amount_tb NUMERIC NOT NULL,
  sales_count INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seller_id UUID REFERENCES public.sellers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "Everyone can view sellers" 
ON public.sellers 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage sellers" 
ON public.sellers 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for sales
CREATE POLICY "Everyone can view sales" 
ON public.sales 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admin can update/delete sales" 
ON public.sales 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admin can delete sales" 
ON public.sales 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Enable realtime for both tables
ALTER publication supabase_realtime ADD TABLE public.sellers;
ALTER publication supabase_realtime ADD TABLE public.sales;

-- Insert sample sellers
INSERT INTO public.sellers (name, profile_image_url, sound_file_url) VALUES
('Daniel', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/daniel.png', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/daniel.mp3'),
('Robin', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/robin.jpeg', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/robin.mp3'),
('Tomas', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/tomas.jpeg', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/tomas.mp3'),
('Hellos', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/hellos.jpeg', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/hellos.mp3'),
('Mommo', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-profiles/profiles/mommo.jpeg', 'https://duoypfodaqaqsiixulkn.supabase.co/storage/v1/object/public/seller-sounds/sounds/mommo.mp3');