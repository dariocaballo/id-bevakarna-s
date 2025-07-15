-- Create table for dashboard layout configurations
CREATE TABLE public.dashboard_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layout_name TEXT NOT NULL DEFAULT 'Default Layout',
  is_active BOOLEAN NOT NULL DEFAULT false,
  layout_config JSONB NOT NULL DEFAULT '{}',
  theme_config JSONB NOT NULL DEFAULT '{}',
  custom_elements JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboard layouts
CREATE POLICY "Anyone can view dashboard layouts" 
ON public.dashboard_layouts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert dashboard layouts" 
ON public.dashboard_layouts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update dashboard layouts" 
ON public.dashboard_layouts 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete dashboard layouts" 
ON public.dashboard_layouts 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_dashboard_layouts_updated_at
BEFORE UPDATE ON public.dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default layout configuration
INSERT INTO public.dashboard_layouts (layout_name, is_active, layout_config, theme_config) VALUES (
  'Standard Layout',
  true,
  '{
    "components": [
      {"id": "stats", "type": "stats_cards", "order": 1, "visible": true, "size": "full"},
      {"id": "latest_sale", "type": "latest_sale", "order": 2, "visible": true, "size": "full"},
      {"id": "seller_circles", "type": "seller_circles", "order": 3, "visible": true, "size": "full"},
      {"id": "king_queen", "type": "king_queen", "order": 4, "visible": true, "size": "full"},
      {"id": "challenges", "type": "daily_challenges", "order": 5, "visible": true, "size": "full"},
      {"id": "top_list", "type": "top_sellers", "order": 6, "visible": true, "size": "full"}
    ]
  }',
  '{
    "primary_color": "hsl(var(--primary))",
    "background": "gradient",
    "card_style": "modern",
    "animation_enabled": true
  }'
);