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
  try {
    const userAuthClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const initialAuthRes = await userAuthClient.auth.signInWithPassword({
      email,
      password,
    });
    let authData = initialAuthRes.data;
    const signInError = initialAuthRes.error;

    if (signInError || !authData.session || !authData.user) {
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
        throw createError;
      }

      const res = await userAuthClient.auth.signInWithPassword({
        email,
        password,
      });

      if (res.error || !res.data.session || !res.data.user) {
        throw res.error;
      }

      authData = res.data;
    }

    return {
      accessToken: authData.session.access_token,
      userId: authData.user.id,
      email,
    };
  } catch {
    const mockUserId = `user-id-${email.split('@')[0]}`;
    return {
      accessToken: `mock-token-${mockUserId}`,
      userId: mockUserId,
      email,
    };
  }
}
