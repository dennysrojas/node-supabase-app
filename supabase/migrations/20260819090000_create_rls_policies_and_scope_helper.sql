-- =============================================================================
-- MIGRACIÓN FASE 1 - TAREA 2: POLÍTICAS RLS DINÁMICAS Y HELPER DE PERMISOS
-- Proyecto: KFC / TRD - Data Entry
-- Entorno: Supabase / PostgreSQL
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. PRERREQUISITOS DE TABLAS, COLUMNAS Y TIPOS (Garantiza ejecución autocontenida)
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projection_status_enum') THEN
        CREATE TYPE projection_status_enum AS ENUM ('DRAFT', 'LOCKED');
    END IF;
END $$;

-- Asegurar existencia de sales_projections_daily
CREATE TABLE IF NOT EXISTS public.sales_projections_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(100) NOT NULL REFERENCES public.stores(store_uid) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2050),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
    projection_date DATE NOT NULL,
    transactions INT NOT NULL DEFAULT 0 CHECK (transactions >= 0),
    average_ticket NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (average_ticket >= 0),
    gross_sales NUMERIC(12, 2) GENERATED ALWAYS AS (transactions * average_ticket) STORED,
    net_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_sales >= 0),
    status projection_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_daily_store_date UNIQUE (store_id, projection_date)
);

-- Asegurar existencia de sales_projections_monthly
CREATE TABLE IF NOT EXISTS public.sales_projections_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(100) NOT NULL REFERENCES public.stores(store_uid) ON DELETE CASCADE,
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

-- Asegurar existencia de columna status en projection_headers si existe la tabla
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projection_headers') THEN
        ALTER TABLE public.projection_headers 
            ADD COLUMN IF NOT EXISTS status projection_status_enum NOT NULL DEFAULT 'DRAFT',
            ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NULL,
            ADD COLUMN IF NOT EXISTS locked_by UUID NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. FUNCIÓN HELPER PL/pgSQL: fn_has_module_store_access
-- Evalúa si el usuario autenticado tiene permiso sobre un Módulo, Tienda y Rol
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_has_module_store_access(
    p_user_id UUID,
    p_module_code VARCHAR,
    p_store_uid VARCHAR,
    p_allowed_roles app_role_enum[] DEFAULT ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']::app_role_enum[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_global_admin BOOLEAN := FALSE;
    v_has_access BOOLEAN := FALSE;
BEGIN
    -- Denegar si no hay usuario autenticado
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Si el usuario es ADMIN_GLOBAL en su perfil, tiene acceso universal
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = p_user_id 
          AND global_role = 'ADMIN_GLOBAL' 
          AND is_active = TRUE
    ) INTO v_is_global_admin;

    IF v_is_global_admin THEN
        RETURN TRUE;
    END IF;

    -- 2. Validar coincidencia en la matriz de alcances (user_module_scopes)
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_module_scopes s
        JOIN public.user_profiles u ON s.user_id = u.id
        WHERE s.user_id = p_user_id
          AND u.is_active = TRUE
          AND s.module_code = p_module_code
          AND (s.role = ANY(p_allowed_roles) OR u.global_role = ANY(p_allowed_roles))
          AND (s.store_uid IS NULL OR s.store_uid = p_store_uid)
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permiso de ejecución
GRANT EXECUTE ON FUNCTION public.fn_has_module_store_access TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. RLS: TABLA sales_projections_daily (Módulo SALES)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sales_projections_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RLS_sales_daily_select" ON public.sales_projections_daily;
CREATE POLICY "RLS_sales_daily_select" ON public.sales_projections_daily
    FOR SELECT
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

DROP POLICY IF EXISTS "RLS_sales_daily_insert" ON public.sales_projections_daily;
CREATE POLICY "RLS_sales_daily_insert" ON public.sales_projections_daily
    FOR INSERT
    WITH CHECK (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

DROP POLICY IF EXISTS "RLS_sales_daily_update" ON public.sales_projections_daily;
CREATE POLICY "RLS_sales_daily_update" ON public.sales_projections_daily
    FOR UPDATE
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
        -- Si es CAPTURADOR, solo puede editar si el registro está en borrador (DRAFT)
        AND (
            status = 'DRAFT' 
            OR public.fn_has_module_store_access(
                auth.uid(), 
                'SALES', 
                store_id, 
                ARRAY['SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
            )
        )
    );

DROP POLICY IF EXISTS "RLS_sales_daily_delete" ON public.sales_projections_daily;
CREATE POLICY "RLS_sales_daily_delete" ON public.sales_projections_daily
    FOR DELETE
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

-- -----------------------------------------------------------------------------
-- 3. RLS: TABLA sales_projections_monthly (Módulo SALES)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sales_projections_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RLS_sales_monthly_select" ON public.sales_projections_monthly;
CREATE POLICY "RLS_sales_monthly_select" ON public.sales_projections_monthly
    FOR SELECT
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

DROP POLICY IF EXISTS "RLS_sales_monthly_insert" ON public.sales_projections_monthly;
CREATE POLICY "RLS_sales_monthly_insert" ON public.sales_projections_monthly
    FOR INSERT
    WITH CHECK (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

DROP POLICY IF EXISTS "RLS_sales_monthly_update" ON public.sales_projections_monthly;
CREATE POLICY "RLS_sales_monthly_update" ON public.sales_projections_monthly
    FOR UPDATE
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
        AND (
            status = 'DRAFT' 
            OR public.fn_has_module_store_access(
                auth.uid(), 
                'SALES', 
                store_id, 
                ARRAY['SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
            )
        )
    );

DROP POLICY IF EXISTS "RLS_sales_monthly_delete" ON public.sales_projections_monthly;
CREATE POLICY "RLS_sales_monthly_delete" ON public.sales_projections_monthly
    FOR DELETE
    USING (
        public.fn_has_module_store_access(
            auth.uid(), 
            'SALES', 
            store_id, 
            ARRAY['SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
        )
    );

-- -----------------------------------------------------------------------------
-- 4. RLS: TABLAS MATRIZ PyG (projection_headers & projection_details) (Módulo PYG)
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projection_headers') THEN
        ALTER TABLE public.projection_headers ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "RLS_pyg_headers_select" ON public.projection_headers;
        CREATE POLICY "RLS_pyg_headers_select" ON public.projection_headers
            FOR SELECT
            USING (
                public.fn_has_module_store_access(
                    auth.uid(), 
                    'PYG', 
                    store_id, 
                    ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']::app_role_enum[]
                )
            );

        DROP POLICY IF EXISTS "RLS_pyg_headers_insert" ON public.projection_headers;
        CREATE POLICY "RLS_pyg_headers_insert" ON public.projection_headers
            FOR INSERT
            WITH CHECK (
                public.fn_has_module_store_access(
                    auth.uid(), 
                    'PYG', 
                    store_id, 
                    ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
                )
            );

        DROP POLICY IF EXISTS "RLS_pyg_headers_update" ON public.projection_headers;
        CREATE POLICY "RLS_pyg_headers_update" ON public.projection_headers
            FOR UPDATE
            USING (
                public.fn_has_module_store_access(
                    auth.uid(), 
                    'PYG', 
                    store_id, 
                    ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
                )
                AND (
                    status = 'DRAFT' 
                    OR public.fn_has_module_store_access(
                        auth.uid(), 
                        'PYG', 
                        store_id, 
                        ARRAY['SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
                    )
                )
            );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projection_details') THEN
        ALTER TABLE public.projection_details ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "RLS_pyg_details_select" ON public.projection_details;
        CREATE POLICY "RLS_pyg_details_select" ON public.projection_details
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.projection_headers h
                    WHERE h.id = projection_header_id
                      AND public.fn_has_module_store_access(
                          auth.uid(), 
                          'PYG', 
                          h.store_id, 
                          ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']::app_role_enum[]
                      )
                )
            );

        DROP POLICY IF EXISTS "RLS_pyg_details_all" ON public.projection_details;
        CREATE POLICY "RLS_pyg_details_all" ON public.projection_details
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.projection_headers h
                    WHERE h.id = projection_header_id
                      AND public.fn_has_module_store_access(
                          auth.uid(), 
                          'PYG', 
                          h.store_id, 
                          ARRAY['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'ADMIN_MODULO']::app_role_enum[]
                      )
                )
            );
    END IF;
END $$;

COMMIT;
