-- =============================================================================
-- MIGRACIÓN FASE 1 - TAREA 3: SCRIPT DE SEEDING INICIAL
-- Proyecto: KFC / TRD - Data Entry
-- Entorno: Supabase / PostgreSQL
-- =============================================================================

BEGIN;

-- Habilitar pgcrypto si no está activo para encriptación de claves en auth.users
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. PRERREQUISITOS DE TIENDAS (Garantiza integridad de FK en user_module_scopes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    store_uid VARCHAR(100) PRIMARY KEY,
    store_id VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    brand_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.stores (store_uid, store_id, store_name, brand_name)
VALUES 
    ('KFC-01', 'KFC-01', 'KFC Mall del Sol', 'KFC'),
    ('KFC-02', 'KFC-02', 'KFC San Marino', 'KFC')
ON CONFLICT (store_uid) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1. POBLADO DEL CATÁLOGO DE MÓDULOS DE NEGOCIO (modules)
-- -----------------------------------------------------------------------------
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
-- 2. REGISTRO DE USUARIOS EN AUTH DE SUPABASE (auth.users)
-- -----------------------------------------------------------------------------
-- Usuario 1: Super Administrador (admin.kfc@trd.com / Admin123456!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin.kfc@trd.com',
    crypt('Admin123456!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Super Administrador KFC"}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Usuario 2: Supervisor de Módulo (supervisor.kfc@trd.com / Super123456!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'supervisor.kfc@trd.com',
    crypt('Super123456!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Supervisor General KFC"}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Usuario 3: Capturador Operativo (capturador.kfc1@trd.com / Cap123456!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'capturador.kfc1@trd.com',
    crypt('Cap123456!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Capturador Operativo KFC Sol"}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Usuario 4: Auditor Solo Lectura (auditor.finanzas@trd.com / Audit123456!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'auditor.finanzas@trd.com',
    crypt('Audit123456!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Auditor Finanzas KFC"}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- -----------------------------------------------------------------------------
-- 3. PERFILES DE USUARIO (public.user_profiles)
-- -----------------------------------------------------------------------------
INSERT INTO public.user_profiles (id, email, full_name, global_role, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin.kfc@trd.com', 'Super Administrador KFC', 'ADMIN_GLOBAL', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'supervisor.kfc@trd.com', 'Supervisor General KFC', 'SUPERVISOR', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'capturador.kfc1@trd.com', 'Capturador Operativo KFC Sol', 'CAPTURADOR', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'auditor.finanzas@trd.com', 'Auditor Finanzas KFC', 'AUDITOR', TRUE)
ON CONFLICT (id) DO UPDATE 
SET 
    full_name = EXCLUDED.full_name,
    global_role = EXCLUDED.global_role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 4. MATRIZ DE ALCANCES DE USUARIO (public.user_module_scopes)
-- -----------------------------------------------------------------------------
-- 4.1 SuperAdmin: Alcance Global (store_uid NULL) para todos los módulos
INSERT INTO public.user_module_scopes (user_id, module_code, store_uid, role)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'SALES', NULL, 'ADMIN_GLOBAL'),
    ('00000000-0000-0000-0000-000000000001', 'PYG', NULL, 'ADMIN_GLOBAL'),
    ('00000000-0000-0000-0000-000000000001', 'SURVEYS', NULL, 'ADMIN_GLOBAL'),
    ('00000000-0000-0000-0000-000000000001', 'QUALITY', NULL, 'ADMIN_GLOBAL')
ON CONFLICT (user_id, module_code, COALESCE(store_uid, 'GLOBAL'), role) DO NOTHING;

-- 4.2 Supervisor: Alcance Global para módulos SALES y PYG
INSERT INTO public.user_module_scopes (user_id, module_code, store_uid, role)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'SALES', NULL, 'SUPERVISOR'),
    ('00000000-0000-0000-0000-000000000002', 'PYG', NULL, 'SUPERVISOR')
ON CONFLICT (user_id, module_code, COALESCE(store_uid, 'GLOBAL'), role) DO NOTHING;

-- 4.3 Capturador: Alcance específico para módulos SALES y PYG (KFC-01)
INSERT INTO public.user_module_scopes (user_id, module_code, store_uid, role)
VALUES 
    ('00000000-0000-0000-0000-000000000003', 'SALES', 'KFC-01', 'CAPTURADOR'),
    ('00000000-0000-0000-0000-000000000003', 'PYG', 'KFC-01', 'CAPTURADOR')
ON CONFLICT (user_id, module_code, COALESCE(store_uid, 'GLOBAL'), role) DO NOTHING;

-- 4.4 Auditor: Alcance Global Solo Lectura para módulos SALES y PYG
INSERT INTO public.user_module_scopes (user_id, module_code, store_uid, role)
VALUES 
    ('00000000-0000-0000-0000-000000000004', 'SALES', NULL, 'AUDITOR'),
    ('00000000-0000-0000-0000-000000000004', 'PYG', NULL, 'AUDITOR')
ON CONFLICT (user_id, module_code, COALESCE(store_uid, 'GLOBAL'), role) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. REGISTRO EN BITÁCORA DE AUDITORÍA INICIAL (public.audit_logs)
-- -----------------------------------------------------------------------------
INSERT INTO public.audit_logs (
    user_id, 
    user_email, 
    user_role, 
    action, 
    details
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin.kfc@trd.com',
    'ADMIN_GLOBAL',
    'SYSTEM_INIT_SEED',
    '{"message": "Sembrado inicial completado: Módulos, roles estándar y usuario superadministrador configurados con éxito."}'
);

COMMIT;
