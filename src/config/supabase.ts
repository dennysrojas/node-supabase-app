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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error de validación en variables de entorno:', JSON.stringify(parsed.error.format(), null, 2));
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


