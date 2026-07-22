-- ============================================================================
-- MIGRACIÓN 001: MÓDULO DE PROYECCIONES FINANCIERAS KFC
-- Fecha: 2026-07-22
-- ============================================================================
-- ----------------------------------------------------------------------------
-- 1. ESTRUCTURA DE TABLAS (DDL)
-- ----------------------------------------------------------------------------
-- Tabla de Locales / Tiendas
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Catálogo de Cuentas Financieras (P&L)
CREATE TABLE IF NOT EXISTS public.account_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('CURRENCY', 'PERCENTAGE', 'BOTH')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_account_group_item UNIQUE (group_name, item_name)
);
-- Cabecera de Proyección por Local y Periodo
CREATE TABLE IF NOT EXISTS public.projection_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    period_year INT NOT NULL CHECK (period_year >= 2020),
    period_month INT NOT NULL CHECK (
        period_month BETWEEN 1 AND 12
    ),
    scenario VARCHAR(50) DEFAULT 'BASE',
    total_sales_net NUMERIC(14, 2) DEFAULT 0.00,
    result_before_depreciation NUMERIC(14, 2) DEFAULT 0.00,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_projection_period UNIQUE (store_id, period_year, period_month, scenario)
);
-- Detalle de Valores por Rubro Contable
CREATE TABLE IF NOT EXISTS public.projection_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_header_id UUID NOT NULL REFERENCES public.projection_headers(id) ON DELETE CASCADE,
    account_item_id UUID NOT NULL REFERENCES public.account_items(id),
    amount_usd NUMERIC(14, 2) DEFAULT 0.00,
    percentage NUMERIC(6, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_projection_detail_item UNIQUE (projection_header_id, account_item_id)
);
-- ----------------------------------------------------------------------------
-- 2. SEGURIDAD Y POLÍTICAS DE ACCESO (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_details ENABLE ROW LEVEL SECURITY;
-- Políticas de Lectura Pública/Anon para catalogos
DROP POLICY IF EXISTS "Permitir lectura de tiendas" ON public.stores;
CREATE POLICY "Permitir lectura de tiendas" ON public.stores FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Permitir lectura de catalogo" ON public.account_items;
CREATE POLICY "Permitir lectura de catalogo" ON public.account_items FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestion de cabeceras" ON public.projection_headers;
CREATE POLICY "Permitir gestion de cabeceras" ON public.projection_headers FOR ALL USING (true);
DROP POLICY IF EXISTS "Permitir gestion de detalles" ON public.projection_details;
CREATE POLICY "Permitir gestion de detalles" ON public.projection_details FOR ALL USING (true);
-- ----------------------------------------------------------------------------
-- 3. SEMBRADO DE DATOS (SEED DE CUENTAS P&L)
-- ----------------------------------------------------------------------------
INSERT INTO public.account_items (group_name, item_name, value_type, sort_order)
VALUES ('Ventas', 'Ventas Brutas', 'CURRENCY', 10),
    ('Ventas', 'Impuesto Servicio', 'BOTH', 11),
    ('Ventas', 'Impuesto IVA', 'BOTH', 12),
    ('Ventas', 'Ventas Netas', 'CURRENCY', 13),
    (
        'Costos de Producción',
        'Aceites y vinagres',
        'BOTH',
        20
    ),
    ('Costos de Producción', 'Bebidas', 'BOTH', 21),
    ('Costos de Producción', 'Café', 'BOTH', 22),
    ('Costos de Producción', 'Cárnicos', 'BOTH', 23),
    (
        'Costos de Producción',
        'Chocolates y bombones',
        'BOTH',
        24
    ),
    ('Costos de Producción', 'Granos', 'BOTH', 25),
    ('Costos de Producción', 'Harinas', 'BOTH', 26),
    ('Costos de Producción', 'Helados', 'BOTH', 27),
    ('Costos de Producción', 'Lácteos', 'BOTH', 28),
    (
        'Costos de Producción',
        'Material de empaque',
        'BOTH',
        29
    ),
    (
        'Costos de Producción',
        'Otros Ingredientes',
        'BOTH',
        30
    ),
    ('Costos de Producción', 'Papas', 'BOTH', 31),
    ('Costos de Producción', 'Postres', 'BOTH', 32),
    ('Costos de Producción', 'Salsas', 'BOTH', 33),
    ('Costos de Producción', 'Trigo', 'BOTH', 34),
    ('Costos de Producción', 'Vegetales', 'BOTH', 35),
    ('Mano de Obra', 'Nómina Local', 'BOTH', 40),
    (
        'Mano de Obra',
        'Nómina Jefes de Área',
        'BOTH',
        41
    ),
    (
        'Mano de Obra',
        'Provisión operación tiendas R',
        'BOTH',
        42
    ),
    ('Servicios Básicos', 'Agua Potable', 'BOTH', 50),
    ('Servicios Básicos', 'Aseo Local', 'BOTH', 51),
    (
        'Servicios Básicos',
        'Comunicaciones',
        'BOTH',
        52
    ),
    ('Servicios Básicos', 'Correo', 'BOTH', 53),
    ('Servicios Básicos', 'Degustación', 'BOTH', 54),
    ('Servicios Básicos', 'Fletes', 'BOTH', 55),
    ('Servicios Básicos', 'Gas', 'BOTH', 56),
    (
        'Servicios Básicos',
        'Honorarios Mantenimiento',
        'BOTH',
        57
    ),
    (
        'Servicios Básicos',
        'Inversión Maq y eq de sistemas',
        'BOTH',
        58
    ),
    ('Servicios Básicos', 'Lunch', 'BOTH', 59),
    ('Servicios Básicos', 'Luz Eléctrica', 'BOTH', 60),
    (
        'Servicios Básicos',
        'Mantenimiento Equipo de Sistemas',
        'BOTH',
        61
    ),
    (
        'Servicios Básicos',
        'Mantenimiento y Reparación de Equipos',
        'BOTH',
        62
    ),
    (
        'Servicios Básicos',
        'Mantenimiento y Reparación de Local',
        'BOTH',
        63
    ),
    ('Servicios Básicos', 'Movilización', 'BOTH', 64),
    ('Servicios Básicos', 'Otros Gastos', 'BOTH', 65),
    (
        'Servicios Básicos',
        'Repuestos y Accesorios',
        'BOTH',
        66
    ),
    (
        'Servicios Básicos',
        'Suministros de Oficina',
        'BOTH',
        67
    ),
    ('Servicios Básicos', 'Teléfono', 'BOTH', 68),
    ('Servicios Básicos', 'Uniformes', 'BOTH', 69),
    (
        'Servicios Básicos',
        'Viáticos y Expreso',
        'BOTH',
        70
    ),
    (
        'Gastos Generales',
        'Agregadores y Logística',
        'BOTH',
        80
    ),
    ('Gastos Generales', 'Cortesías', 'BOTH', 81),
    ('Gastos Generales', 'Delivery', 'BOTH', 82),
    (
        'Gastos Generales',
        'Gastos Contables',
        'BOTH',
        83
    ),
    ('Arriendos y Alícuotas', 'Alícuotas', 'BOTH', 90),
    ('Arriendos y Alícuotas', 'Arriendos', 'BOTH', 91),
    (
        'Gastos Porcentuales',
        'Administrativos',
        'BOTH',
        100
    ),
    (
        'Gastos Porcentuales',
        'Financieros',
        'BOTH',
        101
    ),
    (
        'Gastos Porcentuales',
        'Planta Gasto Fabril',
        'BOTH',
        102
    ),
    ('Gastos Porcentuales', 'Publicidad', 'BOTH', 103),
    ('Gastos Porcentuales', 'Regalías', 'BOTH', 104),
    ('Mermas', 'Mermas General', 'BOTH', 110),
    (
        'Depreciación',
        'Depreciación activos',
        'CURRENCY',
        120
    ),
    (
        'Resultados',
        'Resultado total sin DEPRECIACIÓN',
        'CURRENCY',
        130
    ) ON CONFLICT (group_name, item_name) DO
UPDATE
SET value_type = EXCLUDED.value_type,
    sort_order = EXCLUDED.sort_order;