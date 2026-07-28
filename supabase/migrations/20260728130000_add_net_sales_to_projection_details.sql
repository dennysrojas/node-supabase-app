-- ============================================================================
-- MIGRACIÓN: AGREGAR RUBRO 'VENTAS NETAS' A PROJECTION_DETAILS (H001ECU)
-- Fecha: 2026-07-28
-- ============================================================================

-- 1. ACTUALIZAR CABECERA DE AGOSTO 2026 (MES 8) CON EL VALOR CORRECTO DE VENTAS (8364.70)
UPDATE public.projection_headers
SET total_sales_net = 8364.70,
    updated_at = NOW()
WHERE store_id = 'H001ECU'
  AND period_year = 2026
  AND period_month = 8
  AND scenario = 'BASE';

-- 2. INSERTAR / UPSERT DE 'VENTAS NETAS' EN public.projection_details PARA LOS 12 MESES DE 2026
WITH target_store AS (
    SELECT store_uid AS store_id 
    FROM public.stores 
    WHERE store_uid = 'H001ECU' OR store_id = 'H001'
    LIMIT 1
),
headers AS (
    SELECT id AS header_id, period_month 
    FROM public.projection_headers, target_store 
    WHERE projection_headers.store_id = target_store.store_id 
      AND period_year = 2026 
      AND scenario = 'BASE'
),
sales_item AS (
    SELECT id AS account_item_id
    FROM public.account_items
    WHERE item_name = 'Ventas Netas'
    LIMIT 1
)
INSERT INTO public.projection_details (
    projection_header_id,
    account_item_id,
    amount_usd,
    percentage
)
SELECT 
    h.header_id,
    si.account_item_id,
    v.amount_usd,
    1.0000 -- 100% para Ventas Netas
FROM (VALUES
    (1,  6060.82),
    (2,  5478.72),
    (3,  5614.99),
    (4,  6386.75),
    (5,  7100.00),
    (6,  7079.62),
    (7,  6860.78),
    (8,  8364.70), -- Agosto 2026
    (9,  6173.80),
    (10, 5884.21),
    (11, 6335.26),
    (12, 7505.15)
) AS v(period_month, amount_usd)
JOIN headers h ON h.period_month = v.period_month
CROSS JOIN sales_item si
ON CONFLICT (projection_header_id, account_item_id) 
DO UPDATE SET
    amount_usd = EXCLUDED.amount_usd,
    percentage = EXCLUDED.percentage;
