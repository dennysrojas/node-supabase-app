import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getTestUserToken, type TestUserCredentials } from './helpers/auth.helper.js';

let mockProductsStore: any[] = [];

vi.mock('../src/config/supabase.js', () => {
  const createQueryBuilder = () => {
    let targetId: string | null = null;
    let targetUserId: string | null = null;
    let insertPayload: any = null;
    let updatePayload: any = null;
    let isDelete = false;

    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation((field: string, val: string) => {
        if (field === 'id') targetId = val;
        if (field === 'user_id') targetUserId = val;
        return builder;
      }),
      insert: vi.fn().mockImplementation((item: any) => {
        insertPayload = item;
        return builder;
      }),
      update: vi.fn().mockImplementation((data: any) => {
        updatePayload = data;
        return builder;
      }),
      delete: vi.fn().mockImplementation(() => {
        isDelete = true;
        return builder;
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        const found = mockProductsStore.find((p) => p.id === targetId);
        return Promise.resolve({ data: found || null, error: null });
      }),
      single: vi.fn().mockImplementation(() => {
        if (insertPayload) {
          const newItem = {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
            created_at: new Date().toISOString(),
            ...insertPayload,
          };
          mockProductsStore.push(newItem);
          insertPayload = null;
          return Promise.resolve({ data: newItem, error: null });
        }

        if (updatePayload) {
          const idx = mockProductsStore.findIndex(
            (p) => p.id === targetId && (!targetUserId || p.user_id === targetUserId)
          );
          if (idx !== -1) {
            mockProductsStore[idx] = { ...mockProductsStore[idx], ...updatePayload };
            const updated = mockProductsStore[idx];
            updatePayload = null;
            return Promise.resolve({ data: updated, error: null });
          }
        }

        const found = mockProductsStore.find((p) => p.id === targetId);
        return Promise.resolve({ data: found || null, error: null });
      }),
      then: (resolve: any, reject: any) => {
        if (isDelete && targetId) {
          const idx = mockProductsStore.findIndex(
            (p) => p.id === targetId && (!targetUserId || p.user_id === targetUserId)
          );
          if (idx !== -1) {
            mockProductsStore.splice(idx, 1);
          }
          return Promise.resolve({ error: null }).then(resolve, reject);
        }

        let result = [...mockProductsStore];
        if (targetId) {
          result = result.filter((p) => p.id === targetId);
        }
        return Promise.resolve({ data: result, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };

  const supabaseMock = {
    from: vi.fn(() => createQueryBuilder()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return {
    supabase: supabaseMock,
    supabaseAdmin: supabaseMock,
    env: { SUPABASE_URL: 'http://localhost:54321', SUPABASE_ANON_KEY: 'anon-key' },
  };
});

describe('Suite de Pruebas de Integración - Productos & Auth', () => {
  let mainUser: TestUserCredentials;
  let secondaryUser: TestUserCredentials;

  beforeAll(async () => {
    mockProductsStore = [];
    mainUser = await getTestUserToken('user1@example.com', 'Password123!');
    secondaryUser = await getTestUserToken('user2@example.com', 'Password123!');
  });

  describe('1. Endpoint de Salud', () => {
    it('GET /health debe retornar HTTP 200 con el mensaje OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'OK',
      });
    });
  });

  describe('2. Lectura Pública de Productos', () => {
    it('GET /api/products debe permitir la consulta sin token de autenticación', async () => {
      const response = await request(app).get('/api/products');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/products/:id debe retornar HTTP 404 para un ID inexistente', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/products/${fakeUuid}`);
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Producto no encontrado',
      });
    });

    it('GET /api/products/:id debe retornar HTTP 400 cuando el ID no es un UUID válido', async () => {
      const response = await request(app).get('/api/products/id-invalido-123');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'El ID proporcionado no es un UUID válido',
      });
    });
  });

  describe('3. Protección de Escritura sin Autenticación', () => {
    it('POST /api/products sin el encabezado Authorization debe retornar HTTP 401', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Producto Sin Auth', price: 99.99 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'No autorizado',
      });
    });

    it('POST /api/products con un token de formato o contenido inválido debe retornar HTTP 401', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer token_invalido_123')
        .send({ name: 'Producto Token Invalido', price: 99.99 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'No autorizado',
      });
    });
  });

  describe('4. Creación y Validación de Propiedad de Productos', () => {
    let createdProductId: string;

    it('POST /api/products debe crear exitosamente un producto con un usuario autenticado', async () => {
      const newProduct = { name: 'Teclado Mecánico RGB', price: 150 };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mainUser.accessToken}`)
        .send(newProduct);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newProduct.name);
      expect(response.body.data.price).toBe(newProduct.price);
      expect(response.body.data.user_id).toBe(mainUser.userId);

      createdProductId = response.body.data.id;
    });

    it('POST /api/products debe rechazar (HTTP 400) si faltan campos o si el precio es negativo', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mainUser.accessToken}`)
        .send({ name: '', price: -10 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('PUT /api/products/:id debe rechazar (HTTP 400) si se envía un cuerpo vacío sin campos a actualizar', async () => {
      const response = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${mainUser.accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Debe proporcionar al menos un campo para actualizar',
      });
    });

    it('PUT /api/products/:id debe rechazar la modificación (HTTP 403) si es intentada por otro usuario', async () => {
      const response = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${secondaryUser.accessToken}`)
        .send({ name: 'Intento de Modificación Ajena', price: 1 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'No autorizado para modificar este producto',
      });
    });

    it('DELETE /api/products/:id debe rechazar la eliminación (HTTP 403) si es intentada por otro usuario', async () => {
      const response = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${secondaryUser.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'No autorizado para eliminar este producto',
      });
    });

    it('PUT /api/products/:id debe permitir la actualización al propietario del producto', async () => {
      const updatedData = { name: 'Teclado Mecánico Custom', price: 180 };

      const response = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${mainUser.accessToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updatedData.name);
      expect(response.body.data.price).toBe(updatedData.price);
    });

    it('DELETE /api/products/:id debe permitir la eliminación al propietario del producto', async () => {
      const response = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${mainUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ id: createdProductId });

      const checkRes = await request(app).get(`/api/products/${createdProductId}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
