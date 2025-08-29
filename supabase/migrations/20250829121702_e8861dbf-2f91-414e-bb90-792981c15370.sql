-- Ensure database integrity for sellers table
-- Add UNIQUE constraint on name if it doesn't exist (for future uniqueness)
DO $$ 
BEGIN
    -- Check if unique constraint on name already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sellers_name_unique' 
        AND table_name = 'sellers'
    ) THEN
        -- Remove any duplicate names first by keeping the oldest record
        WITH duplicates AS (
            SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
            FROM public.sellers
        )
        DELETE FROM public.sellers 
        WHERE id IN (
            SELECT id FROM duplicates WHERE rn > 1
        );
        
        -- Now add the unique constraint
        ALTER TABLE public.sellers ADD CONSTRAINT sellers_name_unique UNIQUE (name);
    END IF;
END $$;

-- Ensure updated_at trigger exists for sellers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_sellers_updated_at'
    ) THEN
        CREATE TRIGGER update_sellers_updated_at
            BEFORE UPDATE ON public.sellers
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;