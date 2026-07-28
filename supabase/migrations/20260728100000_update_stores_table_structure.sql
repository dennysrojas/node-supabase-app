-- ============================================================================
-- MIGRACIÓN: REESTRUCTURACIÓN DE LA TABLA STORES
-- Fecha: 2026-07-28
-- ============================================================================

-- 1. Eliminar la restricción de clave foránea existente en projection_headers si existe
ALTER TABLE IF EXISTS public.projection_headers
    DROP CONSTRAINT IF EXISTS projection_headers_store_id_fkey;

-- 2. Asegurar que la columna store_id en projection_headers sea de tipo VARCHAR(100)
ALTER TABLE IF EXISTS public.projection_headers
    ALTER COLUMN store_id TYPE VARCHAR(100);

-- 3. Eliminar la tabla de tiendas anterior
DROP TABLE IF EXISTS public.stores CASCADE;

-- 4. Crear la nueva tabla public.stores con store_uid como VARCHAR(100)
CREATE TABLE public.stores (
    store_uid VARCHAR(100) PRIMARY KEY,
    store_id VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    store_id_and_name VARCHAR(210) GENERATED ALWAYS AS (store_id || ' - ' || store_name) STORED,
    external_store_id VARCHAR(50),
    external_store_number VARCHAR(50),
    external_store_name VARCHAR(150),
    store_type VARCHAR(50),
    store_type_name VARCHAR(100),
    store_segment VARCHAR(50),
    brand_name VARCHAR(100),
    brand_commercial_name VARCHAR(100),
    operation_region_id VARCHAR(50),
    operation_region VARCHAR(100),
    area_manager_id VARCHAR(50),
    area_manager VARCHAR(150),
    country VARCHAR(100),
    city_name VARCHAR(100),
    address TEXT,
    mall VARCHAR(150),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    price_category_id VARCHAR(50),
    price_category VARCHAR(100),
    open_date DATE,
    close_date DATE,
    open_date_auto_config BOOLEAN DEFAULT FALSE,
    source_name VARCHAR(100),
    operation_region_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Eliminar cualquier cabecera huérfana en projection_headers que haga referencia a una tienda que no exista
DELETE FROM public.projection_headers
WHERE store_id NOT IN (SELECT store_uid FROM public.stores);

-- 6. Re-crear la restricción de clave foránea en projection_headers apuntando a store_uid
ALTER TABLE public.projection_headers
    ADD CONSTRAINT projection_headers_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES public.stores(store_uid) ON DELETE CASCADE;

-- 7. Habilitar Seguridad a Nivel de Fila (RLS) y Políticas de Acceso
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de tiendas" ON public.stores;
CREATE POLICY "Permitir lectura de tiendas" ON public.stores 
    FOR SELECT USING (true);

-- Permisos de lectura/modificación según roles Supabase
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
