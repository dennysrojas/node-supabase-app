-- =============================================================================
-- MIGRACIÓN FASE 1: Módulo Ventas Presupuesto y Asentamiento PyG
-- Proyecto: KFC / TRD Proyecciones Financieras
-- Entorno: Supabase / PostgreSQL
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (ENUMS)
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projection_status_enum') THEN
        CREATE TYPE projection_status_enum AS ENUM ('DRAFT', 'LOCKED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_periodicity_enum') THEN
        CREATE TYPE sales_periodicity_enum AS ENUM ('DAILY', 'MONTHLY');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLA: brand_config
-- Almacena la configuración por marca (KFC, Cajun, Fabril, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_code VARCHAR(30) NOT NULL UNIQUE,
    brand_name VARCHAR(100) NOT NULL,
    sales_periodicity sales_periodicity_enum NOT NULL DEFAULT 'DAILY',
    tax_discount_pct NUMERIC(5, 4) NOT NULL DEFAULT 0.1200, -- Ej: 0.12 = 12% IVA/descuentos
    default_production_cost_pct NUMERIC(5, 4) NOT NULL DEFAULT 0.3000, -- Ej: 0.30 = 30% Costo Prod.
    allow_monthly_cost_pct_variation BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE exclusivamente para "Fabril"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sembrado inicial de marcas configuradas
INSERT INTO public.brand_config (brand_code, brand_name, sales_periodicity, allow_monthly_cost_pct_variation)
VALUES 
    ('KFC', 'Kentucky Fried Chicken', 'DAILY', FALSE),
    ('CAJUN', 'Cajun Grill', 'MONTHLY', FALSE),
    ('FABRIL', 'Fabril / Centro de Producción', 'MONTHLY', TRUE)
ON CONFLICT (brand_code) DO UPDATE 
SET 
    sales_periodicity = EXCLUDED.sales_periodicity,
    allow_monthly_cost_pct_variation = EXCLUDED.allow_monthly_cost_pct_variation,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 3. TABLA: sales_projections_daily
-- Carga diaria por Transacciones y Ticket Promedio (ej. KFC)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_projections_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2050),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
    projection_date DATE NOT NULL,
    transactions INT NOT NULL DEFAULT 0 CHECK (transactions >= 0),
    average_ticket NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (average_ticket >= 0),
    -- Venta Bruta calculada automáticamente por el motor de PostgreSQL
    gross_sales NUMERIC(12, 2) GENERATED ALWAYS AS (transactions * average_ticket) STORED,
    net_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_sales >= 0),
    status projection_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_sales_daily_store_date UNIQUE (store_id, projection_date)
);

CREATE INDEX IF NOT EXISTS idx_sales_daily_lookup 
    ON public.sales_projections_daily(store_id, year, month);

-- -----------------------------------------------------------------------------
-- 4. TABLA: sales_projections_monthly
-- Carga mensual directa para marcas de frecuencia mensual (ej. Cajun, Fabril)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_projections_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2050),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    gross_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gross_sales >= 0),
    net_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_sales >= 0),
    status projection_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_sales_monthly_store_period UNIQUE (store_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_sales_monthly_lookup 
    ON public.sales_projections_monthly(store_id, year);

-- -----------------------------------------------------------------------------
-- 5. ACTUALIZACIÓN: projection_headers (Matriz PyG / P&L)
-- Incorpora estado de asentamiento (DRAFT/LOCKED) y estandarización de escenario
-- -----------------------------------------------------------------------------
ALTER TABLE public.projection_headers 
    ADD COLUMN IF NOT EXISTS status projection_status_enum NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS locked_by UUID NULL,
    ALTER COLUMN scenario SET DEFAULT 'BASE';

-- Homogeneizar registros existentes a 'BASE'
UPDATE public.projection_headers 
SET scenario = 'BASE' 
WHERE scenario IS NULL OR scenario <> 'BASE';

CREATE INDEX IF NOT EXISTS idx_projection_headers_status 
    ON public.projection_headers(store_id, year, status);

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS: Actualización automática del campo `updated_at`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brand_config_updated_at ON public.brand_config;
CREATE TRIGGER trg_brand_config_updated_at
    BEFORE UPDATE ON public.brand_config
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_daily_updated_at ON public.sales_projections_daily;
CREATE TRIGGER trg_sales_daily_updated_at
    BEFORE UPDATE ON public.sales_projections_daily
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_monthly_updated_at ON public.sales_projections_monthly;
CREATE TRIGGER trg_sales_monthly_updated_at
    BEFORE UPDATE ON public.sales_projections_monthly
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMIT;