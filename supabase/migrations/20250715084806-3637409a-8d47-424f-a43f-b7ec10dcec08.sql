-- Create sales table for the dashboard system
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for open access (as requested)
CREATE POLICY "Anyone can view sales" 
ON public.sales 
FOR SELECT 
USING (true);

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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on queries
CREATE INDEX idx_sales_timestamp ON public.sales(timestamp DESC);
CREATE INDEX idx_sales_seller_name ON public.sales(seller_name);

-- Enable realtime for live updates
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.sales;