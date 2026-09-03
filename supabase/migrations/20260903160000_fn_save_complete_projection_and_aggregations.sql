-- =============================================================================
-- MIGRACIÓN FASE 2: ATOMICIDAD TRANSACCIONAL ACID Y AGREGACIÓN SQL
-- Proyecto: KFC / TRD - Data Entry & Proyecciones Financieras
-- Entorno: Supabase / PostgreSQL
-- =============================================================================

-- 1. Función transaccional para persistencia completa de proyecciones P&L (ACID)
CREATE OR REPLACE FUNCTION public.fn_save_complete_projection(
  p_store_id VARCHAR,
  p_period_year INT,
  p_period_month INT,
  p_scenario VARCHAR,
  p_total_sales_net NUMERIC,
  p_result_before_depreciation NUMERIC,
  p_user_id UUID,
  p_details JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_header_id UUID;
BEGIN
  -- Paso 1: Upsert atómico de la cabecera
  INSERT INTO public.projection_headers (
    store_id, period_year, period_month, scenario,
    total_sales_net, result_before_depreciation, created_by, updated_at
  ) VALUES (
    p_store_id, p_period_year, p_period_month, COALESCE(p_scenario, 'BASE'),
    COALESCE(p_total_sales_net, 0), COALESCE(p_result_before_depreciation, 0), p_user_id, NOW()
  )
  ON CONFLICT (store_id, period_year, period_month, scenario)
  DO UPDATE SET
    total_sales_net = EXCLUDED.total_sales_net,
    result_before_depreciation = EXCLUDED.result_before_depreciation,
    updated_at = NOW()
  RETURNING id INTO v_header_id;

  -- Paso 2: Limpieza de detalles en la misma transacción ACID
  DELETE FROM public.projection_details WHERE projection_header_id = v_header_id;

  -- Paso 3: Inserción masiva de detalles desde el JSONB
  IF p_details IS NOT NULL AND jsonb_array_length(p_details) > 0 THEN
    INSERT INTO public.projection_details (
      projection_header_id, account_item_id, amount_usd, percentage
    )
    SELECT
      v_header_id,
      (d->>'account_item_id')::UUID,
      COALESCE((d->>'amount_usd')::NUMERIC, 0),
      COALESCE((d->>'percentage')::NUMERIC, 0)
    FROM jsonb_array_elements(p_details) AS d;
  END IF;

  RETURN v_header_id;
END;
$$;

-- 2. Función SQL para agregación directa de ventas mensuales en PostgreSQL (3.1)
CREATE OR REPLACE FUNCTION public.fn_get_monthly_sales_aggregated(
  p_store_id VARCHAR,
  p_year INT
)
RETURNS TABLE (
  month INT,
  net_sales NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    s.month, 
    ROUND(SUM(s.net_sales)::NUMERIC, 2) AS net_sales
  FROM public.sales_projections_daily s
  WHERE s.store_id = p_store_id AND s.year = p_year
  GROUP BY s.month
  ORDER BY s.month ASC;
$$;
