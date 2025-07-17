-- Lägg till celebration-inställningar i dashboard_settings
INSERT INTO public.dashboard_settings (setting_key, setting_value) VALUES
  ('celebration_enabled', true),
  ('show_bubble', true), 
  ('show_confetti', true),
  ('play_sound', true),
  ('special_effect', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();