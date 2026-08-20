import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Mocks de servicios Supabase
const { mockSelect, mockInsert, mockCreateUser } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockCreateUser: vi.fn()
}));

vi.mock('../src/config/supabase.js', () => {
  const createQueryBuilder = () => {
    let resultPromise: any = null;

    const builder: any = {
      then: (resolve: any, reject: any) => {
        const res = resultPromise || mockSelect() || { data: [], error: null, count: 0 };
        return Promise.resolve(res).then(resolve, reject);
      },
      select: vi.fn().mockImplementation((..._args: any[]) => {
        resultPromise = mockSelect();
        return builder;
      }),
      insert: vi.fn().mockImplementation((...args: any[]) => {
        mockInsert(...args);
        return builder;
      }),
      update: vi.fn().mockImplementation((...args: any[]) => {
        mockInsert(...args);
        return builder;
      }),
      delete: vi.fn().mockImplementation((...args: any[]) => {
        mockInsert(...args);
        return builder;
      }),
      upsert: vi.fn().mockImplementation((...args: any[]) => {
        mockInsert(...args);
        return builder;
      }),
      eq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      range: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => {
        const res = resultPromise || mockSelect() || { data: null, error: null };
        return Promise.resolve(res);
      })
    };
    return builder;
  };

  const supabaseMock = {
    from: vi.fn(() => createQueryBuilder()),
    auth: {
      admin: {
        createUser: mockCreateUser
      }
    }
  };

  return {
    supabase: supabaseMock,
    supabaseAdmin: supabaseMock
  };
});

describe('Suite de Pruebas API REST Admin - /api/users, /api/scopes, /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Rutas de Usuarios (/api/users)', () => {
    it('GET /api/users debe rechazar petición (401) sin token JWT', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/users debe retornar 200 con la lista de usuarios para ADMIN_GLOBAL', async () => {
      mockSelect.mockReturnValue({
        data: [
          { id: 'usr-1', email: 'user1@kfc.com', full_name: 'Usuario 1', global_role: 'CAPTURADOR', is_active: true }
        ],
        error: null
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer mock-token-admin-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('POST /api/users debe rechazar (400) cuando la clave tiene menos de 6 caracteres', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token-admin-1')
        .send({
          email: 'nuevo@kfc.com',
          full_name: 'Nuevo Usuario',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Payload inválido');
    });

    it('POST /api/users debe crear exitosamente (201) un nuevo usuario cuando el payload es válido', async () => {
      mockCreateUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-new-123', email: 'nuevo@kfc.com' } },
        error: null
      });

      mockSelect.mockReturnValue({
        data: { id: 'usr-new-123', email: 'nuevo@kfc.com', full_name: 'Nuevo Usuario', global_role: 'CAPTURADOR' },
        error: null
      });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer mock-token-admin-1')
        .send({
          email: 'nuevo@kfc.com',
          full_name: 'Nuevo Usuario',
          password: 'Password123!',
          global_role: 'CAPTURADOR'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('exitosamente');
    });
  });

  describe('2. Rutas de Alcances (/api/scopes)', () => {
    it('POST /api/scopes debe rechazar (400) si module_code es inválido', async () => {
      const res = await request(app)
        .post('/api/scopes')
        .set('Authorization', 'Bearer mock-token-admin-1')
        .send({
          user_id: 'usr-1',
          module_code: 'INVALID_MODULE'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/scopes debe asignar exitosamente (201) un alcance válido (User x Module x Store x Role)', async () => {
      mockSelect.mockReturnValue({
        data: {
          id: 'scope-1',
          user_id: 'usr-1',
          module_code: 'SALES',
          store_uid: 'KFC-01',
          role: 'CAPTURADOR'
        },
        error: null
      });

      const res = await request(app)
        .post('/api/scopes')
        .set('Authorization', 'Bearer mock-token-admin-1')
        .send({
          user_id: 'usr-1',
          module_code: 'SALES',
          store_uid: 'KFC-01',
          role: 'CAPTURADOR'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.module_code).toBe('SALES');
    });
  });

  describe('3. Rutas de Auditoría (/api/audit)', () => {
    it('GET /api/audit debe retornar 200 con el historial de eventos', async () => {
      mockSelect.mockReturnValue({
        data: [
          { id: 'log-1', action: 'USER_CREATED', module_code: 'SALES', created_at: new Date().toISOString() }
        ],
        count: 1,
        error: null
      });

      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', 'Bearer mock-token-admin-1')
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
