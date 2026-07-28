-- ============================================================================
-- MIGRACIÓN 002: DATOS DE PRUEBA (STORES Y PROYECCIÓN P&L DEMO)
-- ============================================================================
-- 1. INSERTAR LOCALES / TIENDAS DE PRUEBA
INSERT INTO public.stores (
    store_id,
    store_name,
    brand_name,
    country,
    city_name,
    operation_region,
    operation_region_order,
    open_date
)
VALUES 
    ('KFC-UIO-001', 'KFC CCI Quito', 'KFC', 'Ecuador', 'Quito', 'Sierra Norte', 1, '2015-05-10'),
    ('KFC-GYE-001', 'KFC Mall del Sol Guayaquil', 'KFC', 'Ecuador', 'Guayaquil', 'Costa', 2, '2018-08-15'),
    ('KFC-CUE-001', 'KFC Mall del Río Cuenca', 'KFC', 'Ecuador', 'Cuenca', 'Sierra Sur', 3, '2020-02-01')
ON CONFLICT (store_id) DO UPDATE
SET store_name = EXCLUDED.store_name,
    operation_region = EXCLUDED.operation_region;

-- 2. INSERTAR CABECERA DE PROYECCIÓN DE DEMO (KFC CCI Quito - Agosto 2026)
WITH store_ref AS (
    SELECT store_uid
    FROM public.stores
    WHERE store_id = 'KFC-UIO-001'
    LIMIT 1
)
INSERT INTO public.projection_headers (
        store_id,
        period_year,
        period_month,
        scenario,
        total_sales_net,
        result_before_depreciation
    )
SELECT store_uid,
    2026,
    8,
    'BASE',
    44000.00,
    9200.00
FROM store_ref ON CONFLICT (store_id, period_year, period_month, scenario) DO
UPDATE
SET total_sales_net = EXCLUDED.total_sales_net,
    result_before_depreciation = EXCLUDED.result_before_depreciation;

-- 3. INSERTAR DETALLES DE LA PROYECCIÓN VINCULADOS AL CATÁLOGO DE CUENTAS
WITH header_ref AS (
    SELECT ph.id AS header_id
    FROM public.projection_headers ph
        JOIN public.stores s ON ph.store_id = s.store_uid
    WHERE s.store_id = 'KFC-UIO-001'
        AND ph.period_year = 2026
        AND ph.period_month = 8
        AND ph.scenario = 'BASE'
    LIMIT 1
)
INSERT INTO public.projection_details (
        projection_header_id,
        account_item_id,
        amount_usd,
        percentage
    )
SELECT h.header_id,
    ai.id AS account_item_id,
    CASE
        ai.item_name
        WHEN 'Ventas Brutas' THEN 50000.00
        WHEN 'Impuesto IVA' THEN 6000.00
        WHEN 'Ventas Netas' THEN 44000.00
        WHEN 'Cárnicos' THEN 8500.00
        WHEN 'Papas' THEN 2200.00
        WHEN 'Bebidas' THEN 1800.00
        WHEN 'Harinas' THEN 1100.00
        WHEN 'Nómina Local' THEN 6500.00
        WHEN 'Luz Eléctrica' THEN 1200.00
        WHEN 'Agua Potable' THEN 450.00
        WHEN 'Arriendos' THEN 3500.00
        WHEN 'Publicidad' THEN 1500.00
        WHEN 'Resultado total sin DEPRECIACIÓN' THEN 9200.00
        ELSE 300.00
    END AS amount_usd,
    CASE
        ai.item_name
        WHEN 'Cárnicos' THEN 0.1932 -- 19.32%
        WHEN 'Papas' THEN 0.0500 -- 5.00%
        WHEN 'Nómina Local' THEN 0.1477 -- 14.77%
        WHEN 'Arriendos' THEN 0.0795 -- 7.95%
        ELSE 0.0100
    END AS percentage
FROM header_ref h
    CROSS JOIN public.account_items ai ON CONFLICT (projection_header_id, account_item_id) DO
UPDATE
SET amount_usd = EXCLUDED.amount_usd,
    percentage = EXCLUDED.percentage;