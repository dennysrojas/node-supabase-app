import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockSingle,
  mockEq,
  mockOrder,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSingle: vi.fn(),
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
      select: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation((...args: any[]) => {
        mockInsert(...args);
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
      order: (...args: any[]) => mockOrder(...args),
      single: (...args: any[]) => mockSingle(...args),
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

describe("Módulo de Observaciones y Auditoría - Tests de Inmutabilidad y Seguridad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Inmutabilidad de Expedientes Cerrados (NEW-02)", () => {
    it("POST /:id/threads debe rechazar con 422 cuando la observación está CERRADA", async () => {
      // Mock que la observación existe y su estado es CLOSED
      mockSingle.mockResolvedValueOnce({
        data: { id: "obs-123", status: "CLOSED" },
        error: null,
      });

      const response = await request(app)
        .post("/api/v1/observations/obs-123/threads")
        .set("Authorization", "Bearer mock-token-capturador")
        .send({
          message: "Intento de subsanación tardía",
          action_taken: "SUBSANACION",
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("inmutable");
    });

    it("PATCH /:id/status debe rechazar con 422 cuando la observación está CERRADA", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "obs-123", status: "CLOSED" },
        error: null,
      });

      const response = await request(app)
        .patch("/api/v1/observations/obs-123/status")
        .set("Authorization", "Bearer mock-token-supervisor")
        .send({
          status: "OPEN",
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("inmutable");
    });

    it("PATCH /:id/close debe rechazar con 422 si la observación ya se encuentra CERRADA", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "obs-123", status: "CLOSED" },
        error: null,
      });

      const response = await request(app)
        .patch("/api/v1/observations/obs-123/close")
        .set("Authorization", "Bearer mock-token-supervisor")
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("ya se encuentra CERRADO");
    });
  });

  describe("2. Ocultamiento de Esquema Interno en Errores de Base de Datos (NEW-03)", () => {
    it("GET / debe responder mensaje genérico seguro cuando la consulta a base de datos falla", async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "relation \"public.record_observations\" does not exist" },
      });

      const response = await request(app)
        .get("/api/v1/observations")
        .set("Authorization", "Bearer mock-token-admin");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Error interno al procesar la solicitud en el servidor");
      // Asegurar que NO se expuso el nombre de la tabla ni detalles del motor SQL
      expect(response.body.error).not.toContain("relation");
    });
  });
});
