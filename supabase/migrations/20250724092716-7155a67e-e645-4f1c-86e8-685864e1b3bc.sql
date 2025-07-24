-- Create user profiles table for authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    CASE 
      WHEN NEW.email = 'admin@company.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing permissive policies and create secure ones

-- SELLERS TABLE POLICIES
DROP POLICY IF EXISTS "Anyone can view sellers" ON public.sellers;
DROP POLICY IF EXISTS "Anyone can insert sellers" ON public.sellers;
DROP POLICY IF EXISTS "Anyone can update sellers" ON public.sellers;
DROP POLICY IF EXISTS "Anyone can delete sellers" ON public.sellers;

CREATE POLICY "Everyone can view sellers" ON public.sellers
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert sellers" ON public.sellers
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update sellers" ON public.sellers
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete sellers" ON public.sellers
  FOR DELETE USING (public.is_admin());

-- SALES TABLE POLICIES
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can delete sales" ON public.sales;

CREATE POLICY "Everyone can view sales" ON public.sales
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert sales" ON public.sales
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update sales" ON public.sales
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete sales" ON public.sales
  FOR DELETE USING (public.is_admin());

-- DASHBOARD SETTINGS POLICIES
DROP POLICY IF EXISTS "Anyone can view dashboard_settings" ON public.dashboard_settings;
DROP POLICY IF EXISTS "Anyone can insert dashboard_settings" ON public.dashboard_settings;
DROP POLICY IF EXISTS "Anyone can update dashboard_settings" ON public.dashboard_settings;
DROP POLICY IF EXISTS "Anyone can delete dashboard_settings" ON public.dashboard_settings;

CREATE POLICY "Everyone can view dashboard_settings" ON public.dashboard_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert dashboard_settings" ON public.dashboard_settings
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update dashboard_settings" ON public.dashboard_settings
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete dashboard_settings" ON public.dashboard_settings
  FOR DELETE USING (public.is_admin());

-- DAILY CHALLENGES POLICIES
DROP POLICY IF EXISTS "Anyone can view daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Anyone can insert daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Anyone can update daily_challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Anyone can delete daily_challenges" ON public.daily_challenges;

CREATE POLICY "Everyone can view daily_challenges" ON public.daily_challenges
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert daily_challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update daily_challenges" ON public.daily_challenges
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete daily_challenges" ON public.daily_challenges
  FOR DELETE USING (public.is_admin());

-- DASHBOARD LAYOUTS POLICIES
DROP POLICY IF EXISTS "Anyone can view dashboard layouts" ON public.dashboard_layouts;
DROP POLICY IF EXISTS "Anyone can insert dashboard layouts" ON public.dashboard_layouts;
DROP POLICY IF EXISTS "Anyone can update dashboard layouts" ON public.dashboard_layouts;
DROP POLICY IF EXISTS "Anyone can delete dashboard layouts" ON public.dashboard_layouts;

CREATE POLICY "Everyone can view dashboard layouts" ON public.dashboard_layouts
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert dashboard layouts" ON public.dashboard_layouts
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update dashboard layouts" ON public.dashboard_layouts
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete dashboard layouts" ON public.dashboard_layouts
  FOR DELETE USING (public.is_admin());

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();