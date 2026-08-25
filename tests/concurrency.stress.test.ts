import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// Mocks de servicios Supabase
const { mockSelect, mockUpdate, mockUpsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("../src/config/supabase.js", () => {
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
      upsert: vi.fn().mockImplementation((...args: any[]) => {
        mockUpsert(...args);
        return builder;
      }),
      update: vi.fn().mockImplementation((...args: any[]) => {
        mockUpdate(...args);
        return builder;
      }),
      eq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
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
  };

  return {
    supabase: supabaseMock,
    supabaseAdmin: supabaseMock,
  };
});

describe("Pruebas de Estrés de Integridad y Concurrencia (Backend REST API)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Ráfaga de Mutaciones Concurrentes en Estado DRAFT (50 Requests)", () => {
    it("Debe procesar 50 peticiones simultáneas de actualización sin cierres de socket ni deadlocks", async () => {
      mockSelect.mockReturnValue({ data: [], error: null });
      mockUpsert.mockReturnValue({ data: [{ id: "d-1", day: 1, net_sales: 1000 }], error: null });

      const payload = {
        store_id: "store-1",
        year: 2026,
        month: 8,
        days_data: [
          {
            day: 1,
            total_transactions: 100,
            average_ticket: 10,
            total_gross_sales: 1000,
            channels: {
              salon: { transactions: 100, average_ticket: 10, gross_sales: 1000 }
            }
          }
        ]
      };

      // Crear array de 50 promesas concurrentes
      const requests = Array.from({ length: 50 }, () =>
        request(app)
          .post("/api/v1/sales-projections/daily/upsert")
          .send(payload)
      );

      const responses = await Promise.all(requests);

      // Todas las peticiones deben responder con HTTP 200 o HTTP 201 sin colapsar
      responses.forEach((res) => {
        expect([200, 201]).toContain(res.status);
      });
    });
  });

  describe("2. Competencia de Asentamiento Simultáneo (LOCK vs UNLOCK Concurrentes)", () => {
    it("Debe garantizar la atomicidad en la transición de estado sin bloquear hilos", async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const lockPayload = {
        store_id: "store-1",
        year: 2026,
        target_module: "SALES",
      };

      // Invocación simultánea de asentamiento (LOCK) y desbloqueo (UNLOCK)
      const [lockRes, unlockRes] = await Promise.all([
        request(app)
          .post("/api/v1/sales-projections/lock")
          .set("x-user-role", "SUPERVISOR")
          .send(lockPayload),
        request(app)
          .post("/api/v1/sales-projections/unlock")
          .set("x-user-role", "SUPERVISOR")
          .send(lockPayload),
      ]);

      // Ambas peticiones deben responder limpiamente con HTTP 200
      expect(lockRes.status).toBe(200);
      expect(unlockRes.status).toBe(200);
      expect(lockRes.body.success).toBe(true);
      expect(unlockRes.body.success).toBe(true);
    });
  });

  describe("3. Estrés en Bitácora de Auditoría Interceptada (50 Peticiones)", () => {
    it("Debe registrar y consultar eventos de auditoría sin degradación de latencia ni deadlocks", async () => {
      mockSelect.mockReturnValue({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `log-${i}`,
          action: "UPDATE",
          module_code: "SALES",
          store_uid: "store-1",
          created_at: new Date().toISOString()
        })),
        error: null,
        count: 10
      });

      const auditRequests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .get(`/api/audit?page=1&limit=10&search=test-${i}`)
          .set("Authorization", "Bearer mock-token-admin-1"),
      );

      const start = Date.now();
      const responses = await Promise.all(auditRequests);
      const duration = Date.now() - start;

      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // Asegurar que 50 peticiones concurrentes completan en menos de 2000ms
      expect(duration).toBeLessThan(2000);
    });
  });
});
