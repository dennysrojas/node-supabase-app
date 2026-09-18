import type { Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import type { ScopedRequest } from './scope.middleware.js';

/**
 * Middleware interceptor para registro automático de eventos de mutación en audit_logs
 * Intercepta métodos POST, PUT, PATCH, DELETE y registra automáticamente
 * usuario, rol, acción, tienda, módulo, payload entrante (nuevo/anterior) y respuesta.
 */
export function auditInterceptorMiddleware(
  req: ScopedRequest,
  res: Response,
  next: NextFunction
): void {
  const method = req.method.toUpperCase();

  // Filtrar solo operaciones de mutación (POST, PUT, PATCH, DELETE)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  // Ignorar rutas de salud o estáticas si las hubiera
  if (req.path === '/health') {
    return next();
  }

  // Interceptar res.json para capturar la respuesta y estado final
  const originalJson = res.json.bind(res);
  let responseBody: Record<string, unknown> | null = null;

  res.json = function (body: unknown): Response {
    if (body && typeof body === 'object') {
      responseBody = body as Record<string, unknown>;
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    try {
      const storeUid = (
        req.userScope?.store_uid ||
        req.params.store_id ||
        req.params.store_uid ||
        req.query.store_id ||
        req.query.store_uid ||
        req.body?.store_id ||
        req.body?.store_uid ||
        null
      ) as string | null;

      const moduleCode = (
        req.userScope?.module_code ||
        req.body?.module_code ||
        req.body?.target_module ||
        (req.originalUrl.includes('sales') ? 'SALES' : req.originalUrl.includes('projection') ? 'PYG' : null)
      ) as string | null;

      let actionName = `${method}_${req.baseUrl || ''}${req.path}`.replace(/\/+/g, '_');
      // Mapeo a nombres semánticos de acción (TC-59)
      const fullPath = `${req.baseUrl || ''}${req.path}`.toLowerCase();
      if (fullPath.includes('/sales-projections/daily/upsert')) {
        actionName = 'SALES_DAILY_UPSERT';
      } else if (fullPath.includes('/sales-projections/monthly/upsert')) {
        actionName = 'SALES_MONTHLY_UPSERT';
      } else if (fullPath.includes('/sales-projections/lock')) {
        actionName = req.body?.target_module === 'PYG' ? 'PYG_PROJECTION_LOCK' : 'SALES_PROJECTION_LOCK';
      } else if (fullPath.includes('/sales-projections/unlock')) {
        actionName = req.body?.target_module === 'PYG' ? 'PYG_PROJECTION_UNLOCK' : 'SALES_PROJECTION_UNLOCK';
      } else if (fullPath.includes('/projections/save') || (fullPath.includes('/projections') && method === 'POST')) {
        actionName = 'PYG_PROJECTION_SAVE';
      } else if (fullPath.includes('/auth/login')) {
        actionName = 'USER_LOGIN';
      } else if (fullPath.includes('/auth/register')) {
        actionName = 'USER_REGISTER';
      } else if (fullPath.includes('/admin/users') && method === 'POST') {
        actionName = 'ADMIN_CREATE_USER';
      } else if (fullPath.includes('/admin/scopes')) {
        actionName = 'ADMIN_UPDATE_SCOPE';
      }

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'credit_card',
  'creditcard',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'cvv',
  'pin',
]);

function sanitizePayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

      // Extraer payload nuevo y anterior si estuviera presente, con sanitización recursiva
      const payloadNew = req.body ? (sanitizePayload(req.body) as Record<string, unknown>) : null;
      const payloadOld = req.body?.previous_data || req.body?.old_payload
        ? (sanitizePayload(req.body?.previous_data || req.body?.old_payload) as Record<string, unknown>)
        : null;

      // Sanitizar IP remota limitándola al primer IP y máximo 45 caracteres para evitar desbordamiento de columna (TC-58, H-00)
      const rawForwarded = req.headers['x-forwarded-for'];
      let clientIp: string | undefined;
      if (typeof rawForwarded === 'string') {
        clientIp = rawForwarded.split(',')[0].trim().substring(0, 45);
      } else if (Array.isArray(rawForwarded) && rawForwarded.length > 0) {
        clientIp = rawForwarded[0].split(',')[0].trim().substring(0, 45);
      } else {
        clientIp = (req.ip || req.socket?.remoteAddress || '').substring(0, 45) || undefined;
      }

      AdminService.logAudit({
        user_id: req.user?.id || req.userProfile?.id,
        user_email: req.user?.email || req.userProfile?.email,
        user_role: req.userProfile?.global_role || req.userScope?.role,
        action: actionName,
        module_code: moduleCode || undefined,
        store_uid: storeUid || undefined,
        details: {
          method,
          url: req.originalUrl || req.url,
          params: req.params,
          query: req.query,
          payload_new: payloadNew,
          payload_old: payloadOld,
          response_status: res.statusCode,
          response_success: responseBody?.success ?? (res.statusCode >= 200 && res.statusCode < 400)
        },
        ip_address: clientIp
      }).catch(() => {
        // Log asíncrono no bloqueante
      });
    } catch {
      // Evitar que fallas de auditoría interrumpan el ciclo HTTP
    }
  });

  next();
}
