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

      const actionName = `${method}_${req.baseUrl || ''}${req.path}`.replace(/\/+/g, '_');

      // Extraer payload nuevo y anterior si estuviera presente
      const payloadNew = req.body ? { ...req.body } : null;
      if (payloadNew && payloadNew.password) {
        payloadNew.password = '[REDACTED]';
      }

      const payloadOld = req.body?.previous_data || req.body?.old_payload || null;

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
        ip_address: (req.headers['x-forwarded-for'] as string) || req.ip
      }).catch(() => {
        // Log asíncrono no bloqueante
      });
    } catch {
      // Evitar que fallas de auditoría interrumpan el ciclo HTTP
    }
  });

  next();
}
