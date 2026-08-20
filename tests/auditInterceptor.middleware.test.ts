import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Response } from 'express';
import { auditInterceptorMiddleware } from '../src/middlewares/auditInterceptor.middleware.js';
import { AdminService } from '../src/services/admin.service.js';

// Spy en AdminService.logAudit
const logAuditSpy = vi.spyOn(AdminService, 'logAudit').mockResolvedValue();

const testApp = express();
testApp.use(express.json());
testApp.use((req: any, _res, next) => {
  req.user = { id: 'usr-test-123', email: 'tester@kfc.com' };
  req.userProfile = { id: 'usr-test-123', global_role: 'CAPTURADOR' };
  req.userScope = { module_code: 'SALES', store_uid: 'KFC-01', role: 'CAPTURADOR' };
  next();
});
testApp.use(auditInterceptorMiddleware as any);

testApp.get('/test-get', (_req, res: Response) => {
  res.status(200).json({ success: true });
});

testApp.post('/test-post', (req, res: Response) => {
  res.status(201).json({ success: true, id: 'new-item-1', data: req.body });
});

testApp.put('/test-put/:id', (req, res: Response) => {
  res.status(200).json({ success: true, updated: req.body });
});

testApp.delete('/test-delete/:id', (_req, res: Response) => {
  res.status(200).json({ success: true, message: 'Deleted' });
});

describe('Middleware Interceptor de Auditoría (auditInterceptorMiddleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('No debe registrar auditoría para peticiones GET', async () => {
    const response = await request(testApp).get('/test-get');

    expect(response.status).toBe(200);
    expect(logAuditSpy).not.toHaveBeenCalled();
  });

  it('Debe registrar automáticamente auditoría al realizar un POST con payload nuevo', async () => {
    const payload = { store_id: 'KFC-01', amount: 1500 };
    const response = await request(testApp)
      .post('/test-post')
      .send(payload);

    expect(response.status).toBe(201);
    expect(logAuditSpy).toHaveBeenCalled();

    const auditCall = logAuditSpy.mock.calls[0][0];
    expect(auditCall.user_id).toBe('usr-test-123');
    expect(auditCall.module_code).toBe('SALES');
    expect(auditCall.store_uid).toBe('KFC-01');
    expect(auditCall.details?.payload_new).toEqual(payload);
  });

  it('Debe registrar automáticamente auditoría al realizar un PUT con payload anterior y nuevo', async () => {
    const payload = { amount: 2000, previous_data: { amount: 1500 } };
    const response = await request(testApp)
      .put('/test-put/999')
      .send(payload);

    expect(response.status).toBe(200);
    expect(logAuditSpy).toHaveBeenCalled();

    const auditCall = logAuditSpy.mock.calls[0][0];
    expect(auditCall.details?.payload_old).toEqual({ amount: 1500 });
  });

  it('Debe registrar automáticamente auditoría al realizar un DELETE', async () => {
    const response = await request(testApp).delete('/test-delete/999');

    expect(response.status).toBe(200);
    expect(logAuditSpy).toHaveBeenCalled();

    const auditCall = logAuditSpy.mock.calls[0][0];
    expect(auditCall.action).toContain('DELETE');
  });
});
