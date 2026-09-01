-- =============================================================================
-- ESQUEMA DDL & POLÍTICAS RLS (Row Level Security) - GESTIÓN DE OBSERVACIONES
-- SISTEMA DE PROYECCIONES FINANCIERAS & MATRIZ PyG (GRUPO KFC / TRD)
-- =============================================================================

-- 1. ENUMERACIONES DE ESTADO Y SEVERIDAD
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'observation_status_enum') THEN
    CREATE TYPE observation_status_enum AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'observation_severity_enum') THEN
    CREATE TYPE observation_severity_enum AS ENUM ('APPROVAL', 'WARNING', 'CRITICAL');
  END IF;
END $$;

-- 2. TABLA PRINCIPAL DE OBSERVACIONES (record_observations)
CREATE TABLE IF NOT EXISTS record_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  module_code VARCHAR(20) NOT NULL, -- 'SALES' o 'PYG'
  cell_key VARCHAR(100),            -- Opcional: Identificador de celda/fila (ej. 'sales-day-15-domicilio')
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity observation_severity_enum NOT NULL DEFAULT 'WARNING',
  status observation_status_enum NOT NULL DEFAULT 'OPEN',
  created_by_id UUID NOT NULL,
  created_by_email VARCHAR(255) NOT NULL,
  created_by_role VARCHAR(50) NOT NULL,
  closed_at TIMESTAMPTZ,
  closed_by_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexación estratégica para alto rendimiento O(1)
CREATE INDEX IF NOT EXISTS idx_obs_context ON record_observations (store_id, year, month, module_code);
CREATE INDEX IF NOT EXISTS idx_obs_cell_key ON record_observations (cell_key);
CREATE INDEX IF NOT EXISTS idx_obs_status ON record_observations (status);

-- 3. TABLA DE HILOS Y SUBSANACIONES (observation_threads)
CREATE TABLE IF NOT EXISTS observation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES record_observations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  action_taken VARCHAR(50) DEFAULT 'REPLY', -- 'REPLY', 'SUBSANACION', 'STATUS_CHANGE'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_obs ON observation_threads (observation_id);

-- 4. TRIGGER PARA ACTUALIZACIÓN AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION update_record_observations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_record_observations_updated_at ON record_observations;
CREATE TRIGGER trg_update_record_observations_updated_at
  BEFORE UPDATE ON record_observations
  FOR EACH ROW
  EXECUTE FUNCTION update_record_observations_updated_at();

-- 5. CONFIGURACIÓN DE SEGURIDAD RLS (Row Level Security) EN SUPABASE
ALTER TABLE record_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_threads ENABLE ROW LEVEL SECURITY;

-- Política RLS 1: Lectura permitida para usuarios autenticados
CREATE POLICY "Permitir lectura de observaciones a usuarios autenticados"
  ON record_observations FOR SELECT
  TO authenticated
  USING (true);

-- Política RLS 2: Creación restringida a AUDITOR, SUPERVISOR y ADMIN_GLOBAL
CREATE POLICY "Permitir creacion de observaciones a Auditores y Admins"
  ON record_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'global_role' IN ('AUDITOR', 'SUPERVISOR', 'ADMIN_GLOBAL')
  );

-- Política RLS 3: Actualización de estado reservada a roles de control
CREATE POLICY "Permitir cambio de estado a Auditores y Supervisores"
  ON record_observations FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'global_role' IN ('AUDITOR', 'SUPERVISOR', 'ADMIN_GLOBAL')
  );

-- Política RLS 4: Inmutabilidad estricta - NINGÚN ROL PUEDE BORRAR OBSERVACIONES
CREATE POLICY "Bloqueo total de eliminacion de observaciones"
  ON record_observations FOR DELETE
  TO authenticated
  USING (false);

-- Política RLS 5: Hilos conversacionales - Lectura pública autenticada
CREATE POLICY "Permitir lectura de hilos a usuarios autenticados"
  ON observation_threads FOR SELECT
  TO authenticated
  USING (true);

-- Política RLS 6: Hilos conversacionales - Creación (Respuesta/Subsanación) abierta a roles autorizados
CREATE POLICY "Permitir respuestas e hilos a usuarios autenticados"
  ON observation_threads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comentario explicativo de la tabla
COMMENT ON TABLE record_observations IS 'Tabla de observaciones y expedientes de auditoria interna con ciclo de vida de estados.';
COMMENT ON TABLE observation_threads IS 'Hilo conversacional trazable de respuestas y subsanaciones documentales asociadas a hallazgos.';
