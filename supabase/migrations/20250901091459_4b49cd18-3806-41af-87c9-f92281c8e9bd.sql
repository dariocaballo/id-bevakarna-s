-- Fix search_path security warnings for the functions
DROP FUNCTION IF EXISTS get_daily_totals(DATE);
DROP FUNCTION IF EXISTS get_monthly_totals(DATE);

CREATE OR REPLACE FUNCTION get_daily_totals(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_today NUMERIC,
  seller_totals JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH daily_sales AS (
    SELECT 
      seller_name,
      seller_id,
      SUM(amount_tb) as amount
    FROM sales 
    WHERE DATE(timestamp AT TIME ZONE 'UTC') = target_date
    GROUP BY seller_name, seller_id
  )
  SELECT 
    COALESCE((SELECT SUM(amount_tb) FROM sales WHERE DATE(timestamp AT TIME ZONE 'UTC') = target_date), 0) as total_today,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'seller_name', seller_name,
        'seller_id', seller_id, 
        'amount', amount
      )
    ), '[]'::jsonb) as seller_totals
  FROM daily_sales;
END;
$$;

CREATE OR REPLACE FUNCTION get_monthly_totals(target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE))
RETURNS TABLE (
  total_month NUMERIC,
  seller_totals JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_sales AS (
    SELECT 
      seller_name,
      seller_id,
      SUM(amount_tb) as amount
    FROM sales 
    WHERE DATE_TRUNC('month', timestamp AT TIME ZONE 'UTC') = target_month
    GROUP BY seller_name, seller_id
  )
  SELECT 
    COALESCE((SELECT SUM(amount_tb) FROM sales WHERE DATE_TRUNC('month', timestamp AT TIME ZONE 'UTC') = target_month), 0) as total_month,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'seller_name', seller_name,
        'seller_id', seller_id,
        'amount', amount
      )
    ), '[]'::jsonb) as seller_totals
  FROM monthly_sales;
END;
$$;