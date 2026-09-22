/**
 * Ejecución empírica UAT v4 — esquemas Zod y control de alcance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createProjectionSchema } from '../src/schemas/projection.schema.js';
import { createUserSchema, assignScopeSchema } from '../src/schemas/admin.schema.js';
import { requireModuleScope } from '../src/middlewares/scope.middleware.js';

const { mockSelect, mockUpdate, mockUpsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpsert: vi.fn()
}));

vi.mock('../src/config/supabase.js', () => {
  const createQueryBuilder = () => {
    const builder: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) => {
        const res = mockSelect();
        return Promise.resolve(res || { data: [], error: null }).then(resolve, reject);
      },
      select: vi.fn().mockImplementation(() => builder),
      upsert: vi.fn().mockImplementation((...args: unknown[]) => {
        mockUpsert(...args);
        return builder;
      }),
      update: vi.fn().mockImplementation((...args: unknown[]) => {
        mockUpdate(...args);
        return builder;
      }),
      eq: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };
    return builder;
  };
  const supabaseMock = { from: vi.fn(() => createQueryBuilder()), auth: { getUser: vi.fn() } };
  return { supabase: supabaseMock, supabaseAdmin: supabaseMock };
});

const validDetail = { account_item_id: 'item-2a', amount_usd: 120.5, percentage: 0.12 };

describe('UAT backend — payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('TC-VAL acepta una pérdida, rechaza tienda vacía y un porcentaje fuera de rango', () => {
    const ok = createProjectionSchema.safeParse({
      store_id: 'KFC-01',
      period_year: 2026,
      period_month: 3,
      details: [validDetail]
    });
    const loss = createProjectionSchema.safeParse({
      store_id: 'KFC-01',
      period_year: 2026,
      period_month: 3,
      details: [{ account_item_id: 'item-10a', amount_usd: -15.5, percentage: -0.15 }]
    });
    const blankStore = createProjectionSchema.safeParse({
      store_id: '   ',
      period_year: 2026,
      period_month: 3,
      details: [validDetail]
    });
    const nullDetails = createProjectionSchema.safeParse({
      store_id: 'KFC-01',
      period_year: 2026,
      period_month: 3,
      details: []
    });
    const badMonth = createProjectionSchema.safeParse({
      store_id: 'KFC-01',
      period_year: 2026,
      period_month: 13,
      details: [validDetail]
    });
    const overPct = createProjectionSchema.safeParse({
      store_id: 'KFC-01',
      period_year: 2026,
      period_month: 1,
      details: [{ account_item_id: 'item-2a', amount_usd: 1, percentage: 2 }]
    });

    const grossRatio = createProjectionSchema.safeParse({
      store_id: '  KFC-01  ',
      period_year: 2026,
      period_month: 1,
      details: [{ account_item_id: 'item-1a', amount_usd: 1000, percentage: 1.1364 }]
    });

    expect(ok.success).toBe(true);
    expect(loss.success).toBe(true);
    expect(blankStore.success).toBe(false);
    expect(nullDetails.success).toBe(false);
    expect(badMonth.success).toBe(false);
    expect(overPct.success).toBe(false);
    expect(grossRatio.success).toBe(true);
    if (grossRatio.success) expect(grossRatio.data.store_id).toBe('KFC-01');
  });

  it('TC-47 rechaza correo externo y acepta dominio corporativo', () => {
    const external = createUserSchema.safeParse({
      email: 'admin@gmail.com',
      full_name: 'Admin Externo',
      password: 'Admin123456!',
      global_role: 'ADMIN_GLOBAL'
    });
    const corporate = createUserSchema.safeParse({
      email: 'admin.kfc@trd.com',
      full_name: 'Admin KFC',
      password: 'Admin123456!',
      global_role: 'ADMIN_GLOBAL'
    });
    const shortPass = createUserSchema.safeParse({
      email: 'admin.kfc@trd.com',
      full_name: 'A',
      password: '123',
      global_role: 'CAPTURADOR'
    });
    expect(external.success).toBe(false);
    expect(corporate.success).toBe(true);
    expect(shortPass.success).toBe(false);
  });

  it('TC-50 payload de alcance con rol superior es sintácticamente válido', () => {
    const parsed = assignScopeSchema.safeParse({
      user_id: '00000000-0000-0000-0000-000000000001',
      module_code: 'SALES',
      store_uid: 'KFC-01',
      role: 'ADMIN_GLOBAL'
    });
    expect(parsed.success).toBe(true);
  });

  it('TC-13 auditor recibe 403 al asentar ventas', async () => {
    const mislabeled = await request(app)
      .post('/api/v1/sales-projections/lock')
      .set('Authorization', 'Bearer mock-token-auditor-user')
      .send({ store_id: 'KFC-01', year: 2026, target_module: 'SALES' });

    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    mockSelect.mockReturnValue({
      data: [{ id: 'sc', module_code: 'SALES', store_uid: 'KFC-01', role: 'AUDITOR' }],
      error: null
    });

    const status = await new Promise<number>((resolve) => {
      const req = {
        user: { id: 'auditor-real' },
        userProfile: { global_role: 'AUDITOR', is_active: true },
        body: { store_id: 'KFC-01', year: 2026, target_module: 'SALES' },
        params: {},
        query: {}
      };
      const res = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json() {
          resolve(this.statusCode);
          return this;
        }
      };
      requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL'])(
        req as never,
        res as never,
        () => resolve(200)
      );
    });
    process.env.NODE_ENV = previousEnv;

    expect(mislabeled.status).toBe(403);
    expect(status).toBe(403);
  });

  it('TC-03 capturador con alcance KFC-01 recibe 403 en KFC-02', async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    mockSelect.mockReturnValue({
      data: [{ id: 'sc', module_code: 'SALES', store_uid: 'KFC-01', role: 'CAPTURADOR' }],
      error: null
    });
    const status = await new Promise<number>((resolve) => {
      const req = {
        user: { id: 'cap-1' },
        userProfile: { global_role: 'CAPTURADOR', is_active: true },
        body: { store_id: 'KFC-02' },
        params: {},
        query: {}
      };
      const res = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json() {
          resolve(this.statusCode);
          return this;
        }
      };
      requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL'])(
        req as never,
        res as never,
        () => resolve(200)
      );
    });
    process.env.NODE_ENV = previousEnv;
    expect(status).toBe(403);
  });

  it('TC-10 capturador recibe 403 al desbloquear', async () => {
    const res = await request(app)
      .post('/api/v1/sales-projections/unlock')
      .set('Authorization', 'Bearer mock-token-capturador')
      .send({ store_id: 'KFC-01', year: 2026, target_module: 'SALES' });
    expect(res.status).toBe(403);
  });

  it('TC-55 capturador recibe 403 al crear usuario', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer mock-token-capturador')
      .send({
        email: 'nuevo@trd.com',
        full_name: 'Nuevo Usuario',
        password: 'Cap123456!',
        global_role: 'CAPTURADOR'
      });
    expect([403, 404]).toContain(res.status);
  });

  it('TC-30 asentar PyG con ventas en DRAFT responde 422', async () => {
    mockSelect.mockReturnValue({ data: [{ id: 'draft-1' }], error: null });
    const res = await request(app)
      .post('/api/v1/sales-projections/lock')
      .set('Authorization', 'Bearer mock-token-admin-global')
      .send({ store_id: 'KFC-01', year: 2026, target_module: 'PYG' });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toMatch(/asentada|LOCKED/i);
  });

  it('asentar PyG sin meses guardados responde 422', async () => {
    mockSelect.mockReturnValue({ data: [], error: null });
    const res = await request(app)
      .post('/api/v1/sales-projections/lock')
      .set('Authorization', 'Bearer mock-token-admin-global')
      .send({ store_id: 'KFC-01', year: 2026, target_module: 'PYG' });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toMatch(/Guarda la matriz/i);
  });

  it('TC-06 upsert diario calcula neta = bruta * 0.88', async () => {
    mockSelect.mockReturnValue({ data: [], error: null });
    const res = await request(app)
      .post('/api/v1/sales-projections/daily/upsert')
      .set('Authorization', 'Bearer mock-token-capturador')
      .send({
        store_id: 'KFC-01',
        year: 2026,
        month: 1,
        tax_discount_pct: 0.12,
        days_data: [{ day: 1, transactions: 100, average_ticket: 10, channels: {} }]
      });
    expect(res.status).toBe(200);
    const payload = mockUpsert.mock.calls.at(-1)?.[0] as Array<{ net_sales: number; transactions: number; average_ticket: number }>;
    expect(payload[0].transactions).toBe(100);
    expect(payload[0].average_ticket).toBe(10);
    expect(payload[0].net_sales).toBe(880);
  });
});
