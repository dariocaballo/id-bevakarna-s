-- Lägg till celebration-inställningar i dashboard_settings (JSON format)
INSERT INTO public.dashboard_settings (setting_key, setting_value) VALUES
  ('celebration_enabled', 'true'::jsonb),
  ('show_bubble', 'true'::jsonb), 
  ('show_confetti', 'true'::jsonb),
  ('play_sound', 'true'::jsonb),
  ('special_effect', 'true'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();