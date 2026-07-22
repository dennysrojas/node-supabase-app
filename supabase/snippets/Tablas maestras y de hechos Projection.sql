-- 1. Tabla de Locales / Tiendas
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,      -- Ej: 'KFC-001'
    name VARCHAR(100) NOT NULL,             -- Ej: 'Local Quito Centro'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Catálogo de Cuentas Financieras (Estructura Jerárquica de Rubros)
CREATE TABLE account_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,       -- Ej: 'Costos de Producción', 'Servicios Básicos', 'Mano de Obra'
    item_name VARCHAR(100) NOT NULL,        -- Ej: 'Cárnicos', 'Luz Eléctrica', 'Nómina Local'
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('CURRENCY', 'PERCENTAGE', 'BOTH')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_name, item_name)
);

-- 3. Cabecera de la Proyección (Periodo y Escenario)
CREATE TABLE projection_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    period_year INT NOT NULL CHECK (period_year >= 2020),
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    scenario VARCHAR(50) DEFAULT 'BASE',    -- 'BASE', 'OPTIMISTA', 'PESIMISTA'
    total_sales_net NUMERIC(14, 2) DEFAULT 0.00,
    result_before_depreciation NUMERIC(14, 2) DEFAULT 0.00,
    created_by UUID,                        -- ID del usuario de Supabase Auth
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, period_year, period_month, scenario)
);

-- 4. Detalle de la Proyección (Valores por Rubro)
CREATE TABLE projection_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_header_id UUID NOT NULL REFERENCES projection_headers(id) ON DELETE CASCADE,
    account_item_id UUID NOT NULL REFERENCES account_items(id),
    amount_usd NUMERIC(14, 2) DEFAULT 0.00,
    percentage NUMERIC(6, 4) DEFAULT 0.0000, -- Ej: 0.1250 = 12.50%
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(projection_header_id, account_item_id)
);