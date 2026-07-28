-- ============================================================================
-- MIGRACIÓN 20260722171600: VERIFICACIÓN DE ESTRUCTURA Y PERMISOS DE TABLAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, 
    group_name character varying(100) NOT NULL, 
    item_name character varying(100) NOT NULL, 
    value_type character varying(20) NOT NULL, 
    sort_order integer DEFAULT 0, 
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_account_group_item') THEN
        ALTER TABLE public.account_items ADD CONSTRAINT uq_account_group_item UNIQUE (group_name, item_name);
    END IF;
END $$;

GRANT ALL ON public.account_items TO anon;
GRANT ALL ON public.account_items TO authenticated;
GRANT ALL ON public.account_items TO service_role;

CREATE TABLE IF NOT EXISTS public.projection_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, 
    store_id uuid NOT NULL, 
    period_year integer NOT NULL, 
    period_month integer NOT NULL, 
    scenario character varying(50) DEFAULT 'BASE'::character varying, 
    total_sales_net numeric(14,2) DEFAULT 0.00, 
    result_before_depreciation numeric(14,2) DEFAULT 0.00, 
    created_by uuid, 
    created_at timestamp with time zone DEFAULT now(), 
    updated_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.projection_headers TO anon;
GRANT ALL ON public.projection_headers TO authenticated;
GRANT ALL ON public.projection_headers TO service_role;

CREATE TABLE IF NOT EXISTS public.projection_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, 
    projection_header_id uuid NOT NULL, 
    account_item_id uuid NOT NULL, 
    amount_usd numeric(14,2) DEFAULT 0.00, 
    percentage numeric(6,4) DEFAULT 0.0000, 
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.projection_details TO anon;
GRANT ALL ON public.projection_details TO authenticated;
GRANT ALL ON public.projection_details TO service_role;

CREATE TABLE IF NOT EXISTS public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, 
    code character varying(20) NOT NULL, 
    name character varying(100) NOT NULL, 
    is_active boolean DEFAULT true, 
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.stores TO anon;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
