import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Response } from 'express';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { requireModuleScope, ScopedRequest } from '../src/middlewares/scope.middleware.js';

// App de Express aislada para probar authMiddleware + requireModuleScope
const testApp = express();
testApp.use(express.json());

// Endpoint 1: Requiere alcance en módulo SALES (Roles permitidos: CAPTURADOR, SUPERVISOR, ADMIN_GLOBAL)
testApp.get(
  '/test-sales-daily',
  authMiddleware as any,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL']) as any,
  (req: ScopedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      userScope: req.userScope
    });
  }
);

// Endpoint 2: Requiere alcance exclusivo de SUPERVISOR o ADMIN_GLOBAL
testApp.post(
  '/test-sales-unlock',
  authMiddleware as any,
  requireModuleScope('SALES', ['SUPERVISOR', 'ADMIN_GLOBAL']) as any,
  (req: ScopedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      userScope: req.userScope
    });
  }
);

describe('Middleware de Validación de Alcance (scope.middleware.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debe responder 401 Unauthorized si la petición no fue autenticada previamente', async () => {
    const unauthApp = express();
    unauthApp.get('/test-no-auth', requireModuleScope('SALES') as any, (_req, res) => {
      res.status(200).json({ success: true });
    });

    const response = await request(unauthApp).get('/test-no-auth');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Usuario no autenticado');
  });

  it('Debe responder 403 Forbidden cuando el usuario intenta acceder a un recurso fuera de su scope', async () => {
    const response = await request(testApp)
      .get('/test-sales-daily')
      .set('Authorization', 'Bearer mock-token-forbidden')
      .query({ store_id: 'UNASSIGNED-STORE' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Acceso denegado');
  });

  it('Debe autorizar (200 OK) a un ADMIN_GLOBAL y adjuntar req.userScope', async () => {
    const response = await request(testApp)
      .get('/test-sales-daily')
      .set('Authorization', 'Bearer mock-token-admin-123')
      .query({ store_id: 'KFC-01' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userScope.module_code).toBe('SALES');
    expect(response.body.userScope.role).toBe('ADMIN_GLOBAL');
  });

  it('Debe autorizar (200 OK) a un SUPERVISOR para acciones de módulo', async () => {
    const response = await request(testApp)
      .post('/test-sales-unlock')
      .set('Authorization', 'Bearer mock-token-supervisor-456')
      .send({ store_id: 'KFC-01' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userScope.module_code).toBe('SALES');
  });
});
