-- Enable REPLICA IDENTITY FULL for realtime to work properly with full row data
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sellers REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for realtime updates
DO $$
BEGIN
  -- Check if tables are already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sellers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sellers;
  END IF;
END $$;