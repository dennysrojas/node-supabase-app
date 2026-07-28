-- ============================================================================
-- MIGRACIÓN: INSERCIÓN DE TIENDAS ADICIONALES Y PROYECCIÓN H001ECU
-- Fecha: 2026-07-28
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. INSERCIÓN / UPSERT DE TIENDAS ADICIONALES EN public.stores
-- -----------------------------------------------------------------------------
INSERT INTO public.stores (
    store_uid,
    store_id,
    store_name,
    external_store_id,
    external_store_number,
    external_store_name,
    store_type,
    store_type_name,
    store_segment,
    brand_name,
    brand_commercial_name,
    operation_region_id,
    operation_region,
    area_manager_id,
    area_manager,
    country,
    city_name,
    address,
    mall,
    latitude,
    longitude,
    price_category_id,
    price_category,
    open_date,
    close_date,
    open_date_auto_config,
    source_name,
    operation_region_order
) VALUES
  ('H001ECU', 'H001', 'COTOCOLLAO', 50009096, 15, 'MALL DEL SOL (KFC)', 'FS DT', 'FREE STANDING', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / COTOCOLLAO/LA PRENSA S/N Y RIGOBERTO HEREDIA', NULL, NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2010-12-27', NULL, false, 'MaxPoint_V1', 1),
  ('H013ECU', 'H013', 'COLON', 50012651, 65, 'COLON Y DIEZ DE AGOSTO K27', 'FS DT HD', 'FREE STANDING', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / AV. COLON S/N Y AV. 10 DE AGOSTO', NULL, NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2010-12-27', NULL, false, 'MaxPoint_V1', 1),
  ('H022ECU', 'H022', 'SHOPPING DURAN', 50014471, 109, 'OUTLET DURAN K 94', 'FC HD', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 1, 'GUAYAQUIL', NULL, NULL, 'ECU', 'GUAYAQUIL', 'GUAYAS / DURAN / ELOY ALFARO (DURAN) / DURAN BOLICHE', 'EL PASEO SHOPPING DURAN', NULL, NULL, '0c049503-85cf-e511-80c6-000d3a3261f3', 'KFC-GYE', '2010-12-27', NULL, false, 'MaxPoint_V1', 2),
  ('H023ECU', 'H023', 'TERMINAL TERR GYQ', 50014526, 111, 'TERMINAL TERRESTRE K 87', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 1, 'GUAYAQUIL', NULL, NULL, 'ECU', 'GUAYAQUIL', 'GUAYAS / GUAYAQUIL / AV. BENJAMIN ROSALES S/N Y AV. JAIME ROLDOS AGUILERA', 'TERMINAL TERRESTRE GYE', NULL, NULL, '0c049503-85cf-e511-80c6-000d3a3261f3', 'KFC-GYE', '2010-12-27', NULL, false, 'MaxPoint_V1', 2),
  ('H046ECU', 'H046', 'POINT FORTIN', 50024017, 140, 'EL FORTIN K092', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 1, 'GUAYAQUIL', NULL, NULL, 'ECU', 'GUAYAQUIL', 'GUAYAS / GUAYAQUIL / VIA PERIMETRAL S/N Y S/N', 'MALL EL FORTIN', NULL, NULL, '0c049503-85cf-e511-80c6-000d3a3261f3', 'KFC-GYE', '2014-07-31', NULL, false, 'MaxPoint_V1', 2),
  ('H047ECU', 'H047', 'HELADERIA EL BOSQUE', 50008569, 9, 'PATIO EL BOSQUE K 11', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / COCHAPAMBA / EL BOSQUE S/N Y ALONSO DE TORRES', 'C.C. EL BOSQUE', NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2015-06-15', NULL, false, 'MaxPoint_V1', 1),
  ('H049ECU', 'H049', 'HELADERIA MALL DEL PACIFICO', 50030150, 160, 'MALL DEL PACIFICO', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'MANTA', 'MANABI / MANTA / MANTA / AV MALECON S/N Y AV 23', 'MALL DEL PACIFICO', NULL, NULL, 'bd039503-85cf-e511-80c6-000d3a3261f3', 'KFC - HIBRIDO', '2017-04-21', NULL, false, 'MaxPoint_V1', 3),
  ('H050ECU', 'H050', 'TERMINAL TERRESTRE MANTA', 50032298, 167, 'TERMINAL TERRESTRE MANTA', 'FC HD', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'MANTA', 'MANABI / MANTA / LOS ESTEROS / AV PUERTO AEROPUERTO LG-01', NULL, NULL, NULL, 'bd039503-85cf-e511-80c6-000d3a3261f3', 'KFC - HIBRIDO', '2017-12-28', NULL, false, 'MaxPoint_V1', 3),
  ('H053ECU', 'H053', 'HELAD TERMINAL TERRESTRE MACHALA', 50033732, 172, 'TERMINAL TERRESTRE MACHALA', 'FC HD', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'MACHALA', 'EL ORO / MACHALA / LA PROVIDENCIA / VÍA FERROVIARIA S/N Y S/N', NULL, NULL, NULL, 'f1039503-85cf-e511-80c6-000d3a3261f3', 'GENERAL - 2014', '2018-06-02', NULL, false, 'MaxPoint_V1', 3),
  ('H058ECU', 'H058', 'EL PORTAL PB', 50053801, 182, 'EL PORTAL SHOPPING', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / CALDERON (CARAPUNGO) / AV SIMON BOLIVAR S/N Y PANAMERICAN NORTE', 'PORTAL SHOPPING', NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2019-10-31', NULL, false, 'MaxPoint_V1', 1),
  ('H059ECU', 'H059', 'EL PORTAL P2', 50053801, 182, 'EL PORTAL SHOPPING', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / CALDERON (CARAPUNGO) / AV SIMON BOLIVAR S/N Y PANAMERICAN NORTE.', 'PORTAL SHOPPING', NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2019-10-31', NULL, false, 'MaxPoint_V1', 1),
  ('H061ECU', 'H061', 'LAGUNA MALL', 50025058, 142, 'CENTRO COMERCIAL LAGUNA MALL K114', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'IBARRA', 'IMBABURA / IBARRA / CENTRO COMERCIAL LAGUNA MALL / MARIANO ACOSTA Y FRAY VACAS GALINDO', NULL, NULL, NULL, '787a99c5-ccce-e711-80d0-000d3a019254', 'KFC SIERRA CENTRO', '2023-01-24', NULL, false, 'MaxPoint_V1', 3),
  ('H062ECU', 'H062', 'MALL DEL NORTE', 50012086, 51, 'MALL DEL NORTE', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 1, 'GUAYAQUIL', NULL, NULL, 'ECU', 'GUAYAQUIL', 'GUAYAS/GUAYAQUIL/PASCUALES/AV. FRANCISCO DE ORELLANA S/N DR. CARLOS JULIO AROSEMENA CENTRO COMERCIAL MALL DEL NORTE FC13 P2', 'MALL DEL NORTE', NULL, NULL, 'f1039503-85cf-e511-80c6-000d3a3261f3', 'GENERAL - 2014', '2023-09-07', NULL, false, 'MaxPoint_V1', 2),
  ('H063ECU', 'H063', 'MALL DEL RIO', 50012300, 58, 'MALL DEL RIO CUENCA PB', 'IL HD', 'IN LINE', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'CUENCA', 'AZUAY/CUENCA/YANUNCAY/DON BOSCO AV FELIPE SEGUNDO CIRCUNVALACION SUR MALL DEL RIO ISLA', NULL, NULL, NULL, 'c6039503-85cf-e511-80c6-000d3a3261f3', 'KFC - CUENCA', '2023-12-03', NULL, false, 'MaxPoint_V1', 3),
  ('H064ECU', 'H064', 'PASEO SHOPPING PORTOVIEJO', 50011021, 31, 'PORTOVIEJO K 42', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'PORTOVIEJO', 'MANABI/PORTOVIEJO/ANDRES DE VERA/AV JORGE WASHINGTON S/N VIA PORTOVIEJO MANTA PASEO SHOPPING PORTOVIEJO ISLA', NULL, NULL, NULL, 'bd039503-85cf-e511-80c6-000d3a3261f3', 'KFC - HIBRIDO', '2024-11-17', NULL, false, 'MaxPoint_V1', 3),
  ('H065ECU', 'H065', 'GRAN PIAZZA MACHALA', 50012570, 63, 'GRAN PIAZZA MACHALA', 'FC HD', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'MACHALA', 'EL ORO/MACHALA/LA PROVIDENCIA/AV. 25 DE JUNIO S/N 6TA AVENIDA VIA MACHALA - PASAJE CENTRO COMERCIAL GRAN I112', 'PIAZZA MACHALA', NULL, NULL, 'f1039503-85cf-e511-80c6-000d3a3261f3', 'GENERAL - 2014', '2024-11-14', NULL, false, 'MaxPoint_V1', 3),
  ('H066ECU', 'H066', 'SANTA MARIA CONDADO', 50028225, 153, 'CONDADO SANTA MARIA', 'IL HD', 'IN LINE', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / SAN FRANCISCO DE RUMIHURCO Y AV. MARISCAL SUCRE', NULL, NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2024-12-21', NULL, false, 'MaxPoint_V1', 1),
  ('H067ECU', 'H067', 'QUICENTRO SUR MEGAMAXI', 50017486, 119, 'QUICENTRO SUR K100 PATIO', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'PICHINCHA / QUITO / QUITUMBE/ AV. MORAN VALVERDE Y AV. QUITUMBE ÑAN', NULL, NULL, NULL, '824d7564-b6f8-e811-80dd-000d3a019254', 'KFC PICHINCHA', '2025-02-15', '2026-01-31', false, 'MaxPoint_V1', 1),
  ('H068ECU', 'H068', 'MALL DEL NORTE PATIO DE COMIDAS', 50012086, 51, 'MALL DEL NORTE', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 1, 'GUAYAQUIL', NULL, NULL, 'ECU', 'GUAYAQUIL', 'GUAYAS/GUAYAQUIL/TARQUI/AV. FRANCISCO DE ORELLANA Y DR. CARLOS JULIO AROSEMENA MONROY', 'MALL DEL NORTE', NULL, NULL, '0c049503-85cf-e511-80c6-000d3a3261f3', 'KFC-GYE', '2025-10-01', NULL, true, 'MaxPoint_V1', 2),
  ('H069ECU', 'H069', 'BOMBOLI SHOPPING STO. DOM.', 50013198, 81, 'BOMBOLI SHOPPING', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'SANTO DOMINGO', 'SANTO DOMINGO DE LOS TSACHILAS / SANTO DOMINGO / ABRAHAM CALAZACON / AV. CHONE S/N Y SAN CRISTOBAL', 'BOMBOLI SHOPPING SANTO DOMINGO', NULL, NULL, 'c6039503-85cf-e511-80c6-000d3a3261f3', 'KFC - CUENCA', '2025-10-31', NULL, false, 'MaxPoint_V1', 3),
  ('H070ECU', 'H070', 'BOMBOLI SHOPPING PATIO', 50013198, 81, 'BOMBOLI SHOPPING', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'SANTO DOMINGO', 'SANTO DOMINGO DE LOS TSACHILAS / SANTO DOMINGO / ABRAHAM CALAZACON / AV. CHONE S/N Y SAN CRISTOBAL', NULL, NULL, NULL, 'c6039503-85cf-e511-80c6-000d3a3261f3', 'KFC - CUENCA', '2025-11-27', NULL, false, 'MaxPoint_V1', 3),
  ('H071ECU', 'H071', 'MALL DEL ALTO CUENCA', 50013652, 93, 'MALL DEL ALTO', 'FC', 'FOOD COURT', 'ICE CREAM ISLAND', 'KENTUCKY FRIED CHICKEN', 'KENTUCKY FRIED CHICKEN', 2, 'PROVINCIAS', NULL, NULL, 'ECU', 'CUENCA', 'AZUAY/CUENCA/YANUNCAY/AUTOPISTA CIRCUNVALACION SUR S/N FELIPE II MALL DEL ALTO, LCIAPA16', NULL, NULL, NULL, 'c6039503-85cf-e511-80c6-000d3a3261f3', 'KFC - CUENCA', '2026-05-20', NULL, true, 'MaxPoint_V1', 3),
  ('HOFIECU', 'HOFI', 'OFICINAS', NULL, NULL, NULL, NULL, NULL, 'FULL STORE', 'HELADERIAS KFC', 'KFC', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', 'w', NULL, NULL, NULL, 'bf039503-85cf-e511-80c6-000d3a3261f3', 'GENERAL - HELADERIA KFC', NULL, NULL, true, 'MaxPoint_V1', 1),
  ('PLCHECU', 'PLCH', 'PLCH PLANTA CHOCOLATERIA', NULL, NULL, NULL, NULL, NULL, 'FULL STORE', 'EL ESPAÑOL', 'EL ESPAÑOL', 3, 'QUITO', NULL, NULL, 'ECU', 'QUITO', NULL, NULL, NULL, NULL, NULL, NULL, '2011-08-01', NULL, false, 'MaxPoint_V1', 1)
ON CONFLICT (store_uid) 
DO UPDATE SET
    store_id = EXCLUDED.store_id,
    store_name = EXCLUDED.store_name,
    external_store_id = EXCLUDED.external_store_id,
    external_store_number = EXCLUDED.external_store_number,
    external_store_name = EXCLUDED.external_store_name,
    store_type = EXCLUDED.store_type,
    store_type_name = EXCLUDED.store_type_name,
    store_segment = EXCLUDED.store_segment,
    brand_name = EXCLUDED.brand_name,
    brand_commercial_name = EXCLUDED.brand_commercial_name,
    operation_region_id = EXCLUDED.operation_region_id,
    operation_region = EXCLUDED.operation_region,
    city_name = EXCLUDED.city_name,
    address = EXCLUDED.address,
    mall = EXCLUDED.mall,
    price_category_id = EXCLUDED.price_category_id,
    price_category = EXCLUDED.price_category,
    open_date = EXCLUDED.open_date,
    close_date = EXCLUDED.close_date,
    open_date_auto_config = EXCLUDED.open_date_auto_config,
    source_name = EXCLUDED.source_name,
    operation_region_order = EXCLUDED.operation_region_order;

-- -----------------------------------------------------------------------------
-- 2. INSERCIÓN / UPSERT EN public.projection_headers (H001ECU - 12 Meses 2026)
-- -----------------------------------------------------------------------------
WITH target_store AS (
    SELECT store_uid AS store_id 
    FROM public.stores 
    WHERE store_uid = 'H001ECU' OR store_id = 'H001'
    LIMIT 1
)
INSERT INTO public.projection_headers (
    store_id,
    period_year,
    period_month,
    scenario,
    total_sales_net,
    result_before_depreciation,
    updated_at
)
SELECT 
    s.store_id,
    v.period_year,
    v.period_month,
    v.scenario,
    v.total_sales_net,
    v.result_before_depreciation,
    NOW()
FROM target_store s,
(VALUES
    (2026, 1,  'BASE', 6060.82, -154.43),
    (2026, 2,  'BASE', 5478.72, -286.88),
    (2026, 3,  'BASE', 5614.99, -426.99),
    (2026, 4,  'BASE', 6386.75,  112.39),
    (2026, 5,  'BASE', 7100.00,  403.20),
    (2026, 6,  'BASE', 7079.62,  301.35),
    (2026, 7,  'BASE', 6860.78,  260.92),
    (2026, 8,  'BASE', 7273.65,  390.29),
    (2026, 9,  'BASE', 6173.80,  -34.09),
    (2026, 10, 'BASE', 5884.21, -209.34),
    (2026, 11, 'BASE', 6335.26,  -38.94),
    (2026, 12, 'BASE', 7505.15,  490.73)
) AS v(period_year, period_month, scenario, total_sales_net, result_before_depreciation)
ON CONFLICT (store_id, period_year, period_month, scenario) 
DO UPDATE SET
    total_sales_net = EXCLUDED.total_sales_net,
    result_before_depreciation = EXCLUDED.result_before_depreciation,
    updated_at = NOW();


-- -----------------------------------------------------------------------------
-- 3. INSERCIÓN / UPSERT EN public.projection_details (Desglose por Rubro P&L)
-- -----------------------------------------------------------------------------
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
)
INSERT INTO public.projection_details (
    projection_header_id,
    account_item_id,
    amount_usd,
    percentage
)
SELECT 
    h.header_id,
    ai.id AS account_item_id,
    v.amount_usd,
    v.percentage
FROM (VALUES
    -- Mes 1 (Enero)
    (1, 'Aceites y vinagres',                   1878.85, 0.3100),
    (1, 'Luz Eléctrica',                          57.00, 0.0094),
    (1, 'Mantenimiento y Reparación de Local',    55.00, 0.0091),
    (1, 'Repuestos y Accesorios',                 30.00, 0.0049),
    (1, 'Inversión Maq y eq de sistemas',         18.18, 0.0030),
    (1, 'Lunch',                                  50.00, 0.0082),
    (1, 'Otros Gastos',                           30.00, 0.0049),
    (1, 'Uniformes',                               9.09, 0.0015),
    (1, 'Honorarios Mantenimiento',               48.00, 0.0079),
    (1, 'Gastos Contables',                       80.00, 0.0132),
    (1, 'Nómina Local',                         1764.73, 0.2912),
    (1, 'Nómina Jefes de Área',                  110.00, 0.0181),
    (1, 'Arriendos',                             592.96, 0.0978),
    (1, 'Alícuotas',                             132.81, 0.0219),
    (1, 'Financieros',                           303.04, 0.0500),
    (1, 'Publicidad',                            303.04, 0.0500),
    (1, 'Administrativos',                       242.43, 0.0400),
    (1, 'Planta Gasto Fabril',                   145.46, 0.0240),
    (1, 'Regalías',                              363.65, 0.0600),
    (1, 'Depreciación activos',                  303.04, 0.0500),

    -- Mes 2 (Febrero)
    (2, 'Aceites y vinagres',                   1698.40, 0.3100),
    (2, 'Luz Eléctrica',                          57.00, 0.0104),
    (2, 'Mantenimiento y Reparación de Local',    55.00, 0.0100),
    (2, 'Repuestos y Accesorios',                 30.00, 0.0055),
    (2, 'Inversión Maq y eq de sistemas',         18.18, 0.0033),
    (2, 'Lunch',                                  50.00, 0.0091),
    (2, 'Otros Gastos',                           30.00, 0.0055),
    (2, 'Uniformes',                               9.09, 0.0017),
    (2, 'Honorarios Mantenimiento',               48.00, 0.0088),
    (2, 'Gastos Contables',                       79.68, 0.0145),

    -- Mes 3 (Marzo)
    (3, 'Aceites y vinagres',                   1740.65, 0.3100),

    -- Mes 4 (Abril)
    (4, 'Aceites y vinagres',                   1979.89, 0.3100),

    -- Mes 5 (Mayo)
    (5, 'Aceites y vinagres',                   2201.00, 0.3100),

    -- Mes 6 (Junio)
    (6, 'Aceites y vinagres',                   2194.68, 0.3100),

    -- Mes 7 (Julio)
    (7, 'Aceites y vinagres',                   2126.84, 0.3100),

    -- Mes 8 (Agosto)
    (8, 'Aceites y vinagres',                   2254.83, 0.3100),

    -- Mes 9 (Septiembre)
    (9, 'Aceites y vinagres',                   1913.88, 0.3100),

    -- Mes 10 (Octubre)
    (10, 'Aceites y vinagres',                  1824.11, 0.3100),

    -- Mes 11 (Noviembre)
    (11, 'Aceites y vinagres',                  1963.93, 0.3100),

    -- Mes 12 (Diciembre)
    (12, 'Aceites y vinagres',                  2326.60, 0.3100)
) AS v(period_month, item_name, amount_usd, percentage)
JOIN headers h ON h.period_month = v.period_month
JOIN public.account_items ai ON ai.item_name = v.item_name
ON CONFLICT (projection_header_id, account_item_id) 
DO UPDATE SET
    amount_usd = EXCLUDED.amount_usd,
    percentage = EXCLUDED.percentage;
