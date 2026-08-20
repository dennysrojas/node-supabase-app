import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase.js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  global_role: 'CAPTURADOR' | 'SUPERVISOR' | 'ADMIN_GLOBAL' | 'AUDITOR' | 'ADMIN_MODULO';
  is_active: boolean;
}

// Extensión de la interfaz Request de Express para incluir req.user y req.userProfile
export interface AuthenticatedRequest extends Request {
  user?: User;
  userProfile?: UserProfile;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      });
      return;
    }

    // Mock de soporte para suite de pruebas en entorno test
    if (process.env.NODE_ENV === 'test' && token.startsWith('mock-token-')) {
      const mockId = token.replace('mock-token-', '');
      if (mockId === 'expired' || mockId === 'invalid') {
        res.status(401).json({ 
          success: false, 
          error: 'No autorizado' 
        });
        return;
      }
      req.user = { id: mockId, email: `${mockId}@example.com` } as User;
      req.userProfile = {
        id: mockId,
        email: `${mockId}@example.com`,
        full_name: `Usuario Test ${mockId}`,
        global_role: mockId.includes('admin') ? 'ADMIN_GLOBAL' : mockId.includes('supervisor') ? 'SUPERVISOR' : 'CAPTURADOR',
        is_active: true
      };
      next();
      return;
    }

    // Validación del token JWT contra el servicio Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ 
        success: false, 
        error: 'No autorizado' 
      });
      return;
    }

    // Inyectar el usuario autenticado
    req.user = data.user;

    // Intentar recuperar el perfil de usuario extendido desde public.user_profiles
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, global_role, is_active')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        if (!profile.is_active) {
          res.status(401).json({ 
            success: false, 
            error: 'No autorizado' 
          });
          return;
        }
        req.userProfile = profile as UserProfile;
      }
    } catch {
      // Continuar si el perfil no existe aún en public.user_profiles
    }

    next();
  } catch {
    res.status(401).json({ 
      success: false, 
      error: 'No autorizado' 
    });
  }
}

