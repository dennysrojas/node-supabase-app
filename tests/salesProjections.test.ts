import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// Functions mock hoisted con Vitest
const {
  mockSingle,
  mockMaybeSingle,
  mockSelect,
  mockUpsert,
  mockUpdate,
  mockLimit,
  mockEq,
  mockOrder,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockUpsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockLimit: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
}));

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
      select: vi.fn().mockImplementation((...args: any[]) => {
        mockSelect(...args);
        return builder;
      }),
      upsert: vi.fn().mockImplementation((...args: any[]) => {
        mockUpsert(...args);
        return builder;
      }),
      update: vi.fn().mockImplementation((...args: any[]) => {
        mockUpdate(...args);
        return builder;
      }),
      eq: vi.fn().mockImplementation((...args: any[]) => {
        mockEq(...args);
        return builder;
      }),
      limit: vi.fn().mockImplementation((...args: any[]) => {
        mockLimit(...args);
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

describe("Módulo de Ventas (Sales Projections) - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GET /api/v1/sales-projections/config/brand/:brandCode", () => {
    it("Debe retornar HTTP 200 con la configuración de marca para KFC", async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          brand_code: "KFC",
          brand_name: "Kentucky Fried Chicken",
          tax_discount_pct: 0.12,
        },
        error: null,
      });

      const response = await request(app)
        .get("/api/v1/sales-projections/config/brand/kfc")
        .set("Authorization", "Bearer mock-token-capturador");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.brand_code).toBe("KFC");
    });

    it("Debe retornar HTTP 404 cuando la marca no existe", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const response = await request(app)
        .get("/api/v1/sales-projections/config/brand/invalid")
        .set("Authorization", "Bearer mock-token-capturador");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("no encontrada");
    });
  });

  describe("2. GET & POST /api/v1/sales-projections/daily", () => {
    it("GET /daily debe retornar HTTP 400 si faltan parámetros requeridos", async () => {
      const response = await request(app)
        .get("/api/v1/sales-projections/daily")
        .set("Authorization", "Bearer mock-token-capturador");
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("GET /daily debe retornar HTTP 200 y la lista de registros cuando la consulta es válida", async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ day: 1, net_sales: 1000 }],
        error: null,
      });

      const response = await request(app)
        .get("/api/v1/sales-projections/daily")
        .set("Authorization", "Bearer mock-token-capturador")
        .query({ store_id: "store-1", year: 2026, month: 8 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it("GET /daily debe retornar HTTP 403 cuando el usuario no tiene alcance en la tienda (BOLA/IDOR)", async () => {
      const response = await request(app)
        .get("/api/v1/sales-projections/daily")
        .set("Authorization", "Bearer mock-token-forbidden")
        .query({ store_id: "store-1", year: 2026, month: 8 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Acceso denegado");
    });

    it("POST /daily/upsert debe rechazar payload si faltan campos obligatorios", async () => {
      const response = await request(app)
        .post("/api/v1/sales-projections/daily/upsert")
        .set("Authorization", "Bearer mock-token-capturador")
        .send({ store_id: "store-1" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("3. POST /api/v1/sales-projections/lock y /unlock", () => {
    it("POST /lock debe retornar HTTP 200 al asentar las ventas", async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const response = await request(app)
        .post("/api/v1/sales-projections/lock")
        .set("Authorization", "Bearer mock-token-supervisor")
        .send({ store_id: "store-1", year: 2026, target_module: "SALES" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("ASENTADA correctamente");
    });

    it("POST /unlock debe rechazar (HTTP 403) si el rol no es SUPERVISOR o ADMIN", async () => {
      const response = await request(app)
        .post("/api/v1/sales-projections/unlock")
        .set("Authorization", "Bearer mock-token-capturador")
        .send({ store_id: "store-1", year: 2026, target_module: "SALES" });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Acceso denegado");
    });

    it("POST /unlock debe permitir desbloqueo (HTTP 200) si el rol es SUPERVISOR", async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const response = await request(app)
        .post("/api/v1/sales-projections/unlock")
        .set("Authorization", "Bearer mock-token-supervisor")
        .send({ store_id: "store-1", year: 2026, target_module: "SALES" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("DESBLOQUEADA exitosamente");
    });
  });
});
