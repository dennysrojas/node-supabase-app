import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';

// Buscar .env en el directorio actual o en el directorio superior (directorio raíz)
const localEnvPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath });
} else {
  dotenv.config();
}

// Validación de variables de entorno con Zod
const envSchema = z.object({
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL debe ser una URL válida' }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: 'SUPABASE_ANON_KEY es requerida' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY es requerida' }),
  PORT: z.coerce.number().default(3000),
});

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const envToParse = {
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL || (isTestEnv ? 'http://127.0.0.1:15421' : undefined),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || (isTestEnv ? 'mock-anon-key-test-environment' : undefined),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || (isTestEnv ? 'mock-service-role-key-test-environment' : undefined),
};

const parsed = envSchema.safeParse(envToParse);

if (!parsed.success) {
  console.error('❌ Error de validación en variables de entorno:', JSON.stringify(parsed.error.format(), null, 2));
  if (isTestEnv) {
    throw new Error('Configuración de entorno inválida para tests: ' + JSON.stringify(parsed.error.format()));
  }
  process.exit(1);
}

export const env = parsed.data;

// Cliente administrativo de Supabase utilizando SERVICE_ROLE_KEY
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);


