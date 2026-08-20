import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../src/middlewares/auth.middleware.js';

// Crear una app de Express aislada para probar el middleware
const testApp = express();
testApp.use(express.json());

testApp.get('/test-protected', authMiddleware as any, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    user: req.user,
    userProfile: req.userProfile
  });
});

describe('Middleware de Verificación Supabase Auth JWT (authMiddleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debe responder 401 Unauthorized cuando la petición no incluye cabecera Authorization', async () => {
    const response = await request(testApp).get('/test-protected');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No autorizado');
  });

  it('Debe responder 401 Unauthorized cuando el formato del token no es Bearer', async () => {
    const response = await request(testApp)
      .get('/test-protected')
      .set('Authorization', 'Basic token123');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No autorizado');
  });

  it('Debe responder 401 Unauthorized cuando el token está vacío ("Bearer ")', async () => {
    const response = await request(testApp)
      .get('/test-protected')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No autorizado');
  });

  it('Debe responder 401 Unauthorized cuando el token JWT ha expirado o es inválido', async () => {
    const response = await request(testApp)
      .get('/test-protected')
      .set('Authorization', 'Bearer mock-token-expired');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No autorizado');
  });

  it('Debe responder 200 OK y adjuntar req.user y req.userProfile cuando el token es válido', async () => {
    const response = await request(testApp)
      .get('/test-protected')
      .set('Authorization', 'Bearer mock-token-admin-123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.id).toBe('admin-123');
    expect(response.body.userProfile.global_role).toBe('ADMIN_GLOBAL');
  });
});
