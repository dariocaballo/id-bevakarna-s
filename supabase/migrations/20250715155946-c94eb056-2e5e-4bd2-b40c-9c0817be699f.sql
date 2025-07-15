-- Create sellers table for managing sellers with goals, images, and sounds
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  profile_image_url TEXT,
  sound_file_url TEXT,
  monthly_goal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily_challenges table
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create dashboard_settings table for admin configuration
CREATE TABLE public.dashboard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add seller_id reference to sales table
ALTER TABLE public.sales ADD COLUMN seller_id UUID REFERENCES public.sellers(id);

-- Enable RLS on new tables
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create open policies for new tables
CREATE POLICY "Anyone can view sellers" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sellers" ON public.sellers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sellers" ON public.sellers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sellers" ON public.sellers FOR DELETE USING (true);

CREATE POLICY "Anyone can view daily_challenges" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert daily_challenges" ON public.daily_challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update daily_challenges" ON public.daily_challenges FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete daily_challenges" ON public.daily_challenges FOR DELETE USING (true);

CREATE POLICY "Anyone can view dashboard_settings" ON public.dashboard_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dashboard_settings" ON public.dashboard_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update dashboard_settings" ON public.dashboard_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete dashboard_settings" ON public.dashboard_settings FOR DELETE USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_challenges_updated_at
  BEFORE UPDATE ON public.daily_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_settings_updated_at
  BEFORE UPDATE ON public.dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sellers_name ON public.sellers(name);
CREATE INDEX idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX idx_daily_challenges_active ON public.daily_challenges(is_active);
CREATE INDEX idx_dashboard_settings_key ON public.dashboard_settings(setting_key);

-- Enable realtime for live updates
ALTER TABLE public.sellers REPLICA IDENTITY FULL;
ALTER TABLE public.daily_challenges REPLICA IDENTITY FULL;
ALTER TABLE public.dashboard_settings REPLICA IDENTITY FULL;

ALTER publication supabase_realtime ADD TABLE public.sellers;
ALTER publication supabase_realtime ADD TABLE public.daily_challenges;
ALTER publication supabase_realtime ADD TABLE public.dashboard_settings;

-- Insert default dashboard settings
INSERT INTO public.dashboard_settings (setting_key, setting_value) VALUES
  ('goals_enabled', 'true'),
  ('challenges_enabled', 'true'),
  ('night_mode_enabled', 'true'),
  ('king_queen_enabled', 'true'),
  ('selfie_enabled', 'true'),
  ('show_recent_sales', 'true'),
  ('show_chart', 'true'),
  ('show_top_list', 'true'),
  ('show_totals', 'true');

-- Create storage buckets for profile images and sounds
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-profiles', 'seller-profiles', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-sounds', 'seller-sounds', true);

-- Create storage policies for seller profiles
CREATE POLICY "Profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can upload profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can update profile images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can delete profile images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-profiles');

-- Create storage policies for seller sounds
CREATE POLICY "Sound files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can upload sound files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can update sound files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-sounds');

CREATE POLICY "Anyone can delete sound files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-sounds');