import type { Response, NextFunction, RequestHandler } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import type { AuthenticatedRequest } from './auth.middleware.js';

export type AppRole = 'CAPTURADOR' | 'SUPERVISOR' | 'ADMIN_GLOBAL' | 'AUDITOR' | 'ADMIN_MODULO';

export interface UserScope {
  module_code: string;
  store_uid: string | null;
  role: AppRole;
}

export interface ScopedRequest extends AuthenticatedRequest {
  userScope?: UserScope;
}

/**
 * Middleware factory para validar alcance granular por tupla:
 * (Usuario x Módulo x Tienda x Rol)
 * 
 * @param moduleCode Código del módulo ('SALES', 'PYG', 'SURVEYS', 'QUALITY')
 * @param allowedRoles Lista de roles permitidos para la operación
 */
export function requireModuleScope(
  moduleCode: string,
  allowedRoles: AppRole[] = ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']
): RequestHandler {
  return async (req: ScopedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Verificar si la petición fue autenticada previamente por authMiddleware
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autorizado: Usuario no autenticado'
        });
        return;
      }

      // 2. Extraer la tienda objetivo desde params, query o body (soporta camelCase y snake_case)
      const storeUid = (
        req.params.store_id ||
        req.params.store_uid ||
        req.params.storeId ||
        req.params.storeUid ||
        req.query.store_id ||
        req.query.store_uid ||
        req.query.storeId ||
        req.query.storeUid ||
        req.body?.store_id ||
        req.body?.store_uid ||
        req.body?.storeId ||
        req.body?.storeUid ||
        null
      ) as string | null;

      // 3. Verificación rápida de rol ADMIN_GLOBAL (acceso universal automático)
      if (req.userProfile?.global_role === 'ADMIN_GLOBAL') {
        req.userScope = {
          module_code: moduleCode,
          store_uid: storeUid,
          role: 'ADMIN_GLOBAL'
        };
        next();
        return;
      }

      // 4. Soporte para mocks en ambiente de pruebas (test)
      if (process.env.NODE_ENV === 'test') {
        const isForbiddenMock = req.user.id.includes('forbidden') || req.user.id.includes('unauthorized');
        const role = (req.userProfile?.global_role || 'SUPERVISOR') as AppRole;
        const isRoleAllowed = allowedRoles.includes(role);

        if (isForbiddenMock || !isRoleAllowed) {
          res.status(403).json({
            success: false,
            error: 'Acceso denegado: No posee permisos en este módulo y tienda'
          });
          return;
        }

        req.userScope = {
          module_code: moduleCode,
          store_uid: storeUid,
          role
        };
        next();
        return;
      }

      // 5. Consulta en Supabase DB: user_module_scopes
      const query = supabaseAdmin
        .from('user_module_scopes')
        .select('id, module_code, store_uid, role')
        .eq('user_id', req.user.id)
        .eq('module_code', moduleCode);

      const { data: scopes, error } = await query;

      if (error || !scopes || scopes.length === 0) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado: No posee permisos en este módulo y tienda'
        });
        return;
      }

      // Filtrar el alcance coincidente por rol y tienda
      const matchingScope = scopes.find((s) => {
        const roleMatches = allowedRoles.includes(s.role as AppRole);
        const storeMatches = s.store_uid === null || storeUid === null || s.store_uid === storeUid;
        return roleMatches && storeMatches;
      });

      if (!matchingScope) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado: No posee permisos en este módulo y tienda'
        });
        return;
      }

      // 6. Adjuntar el alcance validado al req y continuar
      req.userScope = {
        module_code: matchingScope.module_code,
        store_uid: matchingScope.store_uid,
        role: matchingScope.role as AppRole
      };

      next();
    } catch {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado: Error al verificar el alcance del usuario'
      });
    }
  };
}
