-- =============================================================================
-- MIGRACIÓN FASE 1 - TAREA 1: ESTRUCTURA DE ROLES, PERMISOS, MÓDULOS Y AUDITORÍA
-- Proyecto: KFC / TRD - Data Entry
-- Entorno: Supabase / PostgreSQL
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (ENUMS)
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role_enum') THEN
        CREATE TYPE app_role_enum AS ENUM (
            'CAPTURADOR', 
            'SUPERVISOR', 
            'ADMIN_GLOBAL', 
            'AUDITOR', 
            'ADMIN_MODULO'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_module_enum') THEN
        CREATE TYPE app_module_enum AS ENUM (
            'SALES', 
            'PYG', 
            'SURVEYS', 
            'QUALITY'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLA: public.modules
-- Catálogo oficial de módulos de negocio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sembrado inicial de catálogo de módulos
INSERT INTO public.modules (code, name, description, is_active)
VALUES 
    ('SALES', 'Ventas Presupuesto', 'Ingreso y proyección de ventas diarias y mensuales por canal', TRUE),
    ('PYG', 'Matriz PyG', 'Presupuesto y asentamiento de pérdidas y ganancias (P&L)', TRUE),
    ('SURVEYS', 'Encuestas de Satisfacción', 'Módulo de captura y métricas de satisfacción al cliente (NPS)', TRUE),
    ('QUALITY', 'Controles de Calidad', 'Registro de auditorías e inspecciones de calidad de tiendas', TRUE)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 3. TABLA: public.user_profiles
-- Perfil de usuario extendido a partir de auth.users de Supabase
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    global_role app_role_enum NOT NULL DEFAULT 'CAPTURADOR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(global_role);

-- Function & Trigger para crear perfil automáticamente al registrar usuario en auth.users
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, global_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        'CAPTURADOR'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. TABLA: public.user_module_scopes
-- Matriz de alcance: Usuario x Módulo x Unidad de Negocio (Tienda/Zona) x Rol
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_module_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    module_code VARCHAR(50) NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE ON UPDATE CASCADE,
    store_uid VARCHAR(100) NULL REFERENCES public.stores(store_uid) ON DELETE CASCADE,
    zone_code VARCHAR(50) NULL,
    role app_role_enum NOT NULL DEFAULT 'CAPTURADOR',
    assigned_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restricción única para evitar duplicación de alcance para un mismo rol
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_module_store_role 
    ON public.user_module_scopes(user_id, module_code, COALESCE(store_uid, 'GLOBAL'), role);

-- Índices optimizados para consultas frecuentes de permisos
CREATE INDEX IF NOT EXISTS idx_user_scopes_lookup 
    ON public.user_module_scopes(user_id, module_code);

CREATE INDEX IF NOT EXISTS idx_user_scopes_store 
    ON public.user_module_scopes(store_uid);

CREATE INDEX IF NOT EXISTS idx_user_scopes_role 
    ON public.user_module_scopes(role);

-- -----------------------------------------------------------------------------
-- 5. TABLA: public.audit_logs
-- Bitácora de trazabilidad corporativa para eventos globales y por módulo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NULL,
    user_role app_role_enum NULL,
    action VARCHAR(100) NOT NULL, -- Ej: LOGIN, CREATE_RECORD, UPDATE_RECORD, LOCK_PERIOD, UNLOCK_PERIOD, ASSIGN_SCOPE
    module_code VARCHAR(50) NULL REFERENCES public.modules(code) ON DELETE SET NULL,
    store_uid VARCHAR(100) NULL REFERENCES public.stores(store_uid) ON DELETE SET NULL,
    details JSONB NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices optimizados para consulta y filtrado de auditoría
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_store 
    ON public.audit_logs(module_code, store_uid);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
    ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON public.audit_logs(action);

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS: Actualización automática de `updated_at`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_module_scopes_updated_at ON public.user_module_scopes;
CREATE TRIGGER trg_user_module_scopes_updated_at
    BEFORE UPDATE ON public.user_module_scopes
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. SEGURIDAD Y POLÍTICAS DE ACCESO INICIALES (RLS & GRANTS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura base (Lectura pública para catálogo de módulos)
DROP POLICY IF EXISTS "Permitir lectura de módulos" ON public.modules;
CREATE POLICY "Permitir lectura de módulos" ON public.modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de perfiles a autenticados" ON public.user_profiles;
CREATE POLICY "Permitir lectura de perfiles a autenticados" ON public.user_profiles 
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de scopes a autenticados" ON public.user_module_scopes;
CREATE POLICY "Permitir lectura de scopes a autenticados" ON public.user_module_scopes 
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de logs a autenticados" ON public.audit_logs;
CREATE POLICY "Permitir lectura de logs a autenticados" ON public.audit_logs 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Otorgar permisos a roles de Supabase
GRANT SELECT ON public.modules TO anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT ALL ON public.user_module_scopes TO authenticated, service_role;
GRANT ALL ON public.audit_logs TO authenticated, service_role;

COMMIT;
