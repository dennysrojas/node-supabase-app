import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// 1. Crear las funciones mock hoisted con Vitest para evitar errores de importación en TypeScript
const {
  mockSingle,
  mockMaybeSingle,
  mockSelect,
  mockUpsert,
  mockDelete,
  mockInsert,
  mockEq,
  mockOrder,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockUpsert: vi.fn(),
  mockDelete: vi.fn(),
  mockInsert: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
}));

// 2. Mock de Supabase client
vi.mock("../src/config/supabase.js", () => {
  const createQueryBuilder = () => {
    const builder: any = {
      then: (resolve: any, reject: any) => {
        const res = mockSelect();
        return Promise.resolve(res || { data: [], error: null }).then(
          resolve,
          reject,
        );
      },
      select: vi.fn().mockImplementation(() => builder),
      upsert: vi.fn().mockImplementation((...args: any[]) => {
        mockUpsert(...args);
        return builder;
      }),
      delete: vi.fn().mockImplementation((...args: any[]) => {
        mockDelete(...args);
        return builder;
      }),
      insert: (...args: any[]) => mockInsert(...args),
      eq: vi.fn().mockImplementation((...args: any[]) => {
        mockEq(...args);
        return builder;
      }),
      order: (...args: any[]) => mockOrder(...args),
      single: (...args: any[]) => mockSingle(...args),
      maybeSingle: (...args: any[]) => mockMaybeSingle(...args),
    };
    return builder;
  };

  const supabaseMock = {
    from: vi.fn(() => createQueryBuilder()),
  };

  return {
    supabase: supabaseMock,
    supabaseAdmin: supabaseMock,
  };
});

describe("Módulo de Proyecciones Financieras - API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/v1/projections/account-items
  // =========================================================================
  describe("GET /api/v1/projections/account-items", () => {
    it("Debe retornar 200 y el catálogo de cuentas ordenado", async () => {
      const mockCatalog = [
        {
          id: "11111111-1111-1111-1111-111111111111",
          group_name: "Ventas",
          item_name: "Ventas Brutas",
          sort_order: 10,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          group_name: "Mano de Obra",
          item_name: "Nómina Local",
          sort_order: 40,
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockCatalog, error: null });

      const response = await request(app).get(
        "/api/v1/projections/account-items",
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].item_name).toBe("Ventas Brutas");
    });
  });

  // =========================================================================
  // GET /api/v1/projections/stores
  // =========================================================================
  describe("GET /api/v1/projections/stores", () => {
    it("Debe retornar 200 y la lista de tiendas", async () => {
      const mockStores = [
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          code: "KFC-001",
          name: "Quito Centro",
          is_active: true,
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockStores, error: null });

      const response = await request(app).get("/api/v1/projections/stores");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].code).toBe("KFC-001");
    });
  });

  // =========================================================================
  // POST /api/v1/projections
  // =========================================================================
  describe("POST /api/v1/projections", () => {
    const validPayload = {
      store_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      period_year: 2026,
      period_month: 7,
      scenario: "BASE",
      details: [
        {
          account_item_id: "11111111-1111-1111-1111-111111111111",
          amount_usd: 15000.5,
          percentage: 0.1,
        },
      ],
    };

    it("Debe guardar exitosamente la proyección y retornar 201", async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "proj-header-id-123",
          store_id: validPayload.store_id,
          period_year: 2026,
          period_month: 7,
          scenario: "BASE",
          total_sales_net: 15000.5,
          result_before_depreciation: 3200.0,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockInsert.mockResolvedValueOnce({ error: null });

      const response = await request(app)
        .post("/api/v1/projections")
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("proj-header-id-123");
      expect(response.body.data.store_id).toBe(validPayload.store_id);
    });

    it("Debe devolver 400 cuando el payload falla la validación de Zod", async () => {
      const invalidPayload = {
        store_id: "uuid-invalido", // No es un UUID válido
        period_year: 1999, // Fuera de rango
        period_month: 13, // Mes inexistente
        details: [], // Arreglo vacío
      };

      const response = await request(app)
        .post("/api/v1/projections")
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Error de validación en la petición");
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // GET /api/v1/projections/store/:storeId
  // =========================================================================
  describe("GET /api/v1/projections/store/:storeId", () => {
    const storeId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    it("Debe retornar 200 y el P&L completo cuando existe la proyección", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "proj-header-id-123",
          store_id: storeId,
          period_year: 2026,
          period_month: 7,
          scenario: "BASE",
          total_sales_net: 25000.0,
          result_before_depreciation: 4500.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stores: { code: "KFC-001", name: "Quito Centro" },
        },
        error: null,
      });

      mockSelect.mockResolvedValueOnce({
        data: [
          {
            id: "det-1",
            amount_usd: 25000,
            percentage: 1,
            account_items: {
              id: "11111111-1111-1111-1111-111111111111",
              group_name: "Ventas",
              item_name: "Ventas Brutas",
              value_type: "CURRENCY",
              sort_order: 10,
            },
          },
        ],
        error: null,
      });

      const response = await request(app)
        .get(`/api/v1/projections/store/${storeId}`)
        .query({ year: 2026, month: 7, scenario: "BASE" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.store.name).toBe("Quito Centro");
      expect(response.body.data.details).toHaveLength(1);
    });

    it("Debe retornar 404 si no existe proyección registrada para el periodo", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .get(`/api/v1/projections/store/${storeId}`)
        .query({ year: 2026, month: 12, scenario: "BASE" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("No se encontró proyección");
    });
  });
});
