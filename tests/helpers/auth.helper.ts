import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, env } from '../../src/config/supabase.js';

export interface TestUserCredentials {
  accessToken: string;
  userId: string;
  email: string;
}

/**
 * Obtiene un token de acceso JWT y el ID de usuario para un usuario de prueba en Supabase.
 * Utiliza un cliente independiente para sign-in evitando alterar la sesión de supabaseAdmin.
 */
export async function getTestUserToken(
  email: string = 'testuser@example.com',
  password: string = 'TestPassword123!'
): Promise<TestUserCredentials> {
  // Crear un cliente temporal exclusivo para la autenticación del usuario de pruebas
  const userAuthClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Intentar iniciar sesión
  let { data: authData, error: signInError } = await userAuthClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !authData.session || !authData.user) {
    // Crear el usuario con el cliente administrativo
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (
      createError &&
      !createError.message.toLowerCase().includes('already registered') &&
      !createError.message.toLowerCase().includes('already exists')
    ) {
      throw new Error(`Error creando usuario de prueba (${email}): ${createError.message}`);
    }

    // Iniciar sesión con el cliente de usuario independiente
    const res = await userAuthClient.auth.signInWithPassword({
      email,
      password,
    });

    if (res.error || !res.data.session || !res.data.user) {
      throw new Error(`Error autenticando usuario de prueba (${email}): ${res.error?.message}`);
    }

    authData = res.data;
  }

  return {
    accessToken: authData.session.access_token,
    userId: authData.user.id,
    email,
  };
}
