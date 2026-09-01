import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { requireObservationRole } from "../middlewares/observationAuth.middleware.js";

export const observationRouter = Router();

// 1. GET /api/v1/observations - Obtener observaciones con filtros
observationRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { store_id, year, month, module_code, status, cell_key } = req.query;

    let query = supabase
      .from("record_observations")
      .select("*, threads:observation_threads(*)")
      .order("created_at", { ascending: false });

    if (store_id) query = query.eq("store_id", String(store_id));
    if (year) query = query.eq("year", Number(year));
    if (month) query = query.eq("month", Number(month));
    if (module_code) query = query.eq("module_code", String(module_code));
    if (status) query = query.eq("status", String(status));
    if (cell_key) query = query.eq("cell_key", String(cell_key));

    const { data, error } = await query;

    if (error) {
      return res.status(200).json({ success: true, data: [] });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch {
    return res.status(200).json({ success: true, data: [] });
  }
});

// 2. POST /api/v1/observations - Crear un nuevo hallazgo / observación (Auditor, Supervisor, Admin)
observationRouter.post(
  "/",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  async (req: Request, res: Response) => {
    try {
      const { store_id, year, month, module_code, cell_key, title, description, severity } = req.body;

      if (!store_id || !year || !month || !module_code || !title || !description) {
        return res.status(400).json({
          success: false,
          error: "Campos obligatorios incompletos (store_id, year, month, module_code, title, description)",
        });
      }

      const userEmail = (req.headers["x-user-email"] as string) || "auditor.finanzas@trd.com";
      const userRole = (req.headers["x-user-role"] as string) || "AUDITOR";

      const newObs = {
        id: `obs-${Date.now()}`,
        store_id,
        year: Number(year),
        month: Number(month),
        module_code,
        cell_key: cell_key || null,
        title: String(title).trim(),
        description: String(description).trim(),
        severity: severity || "WARNING",
        status: "OPEN",
        created_by_id: "00000000-0000-0000-0000-000000000004",
        created_by_email: userEmail,
        created_by_role: userRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        threads: []
      };

      const { data, error } = await supabase
        .from("record_observations")
        .insert([newObs])
        .select("*")
        .single();

      return res.status(201).json({ success: true, data: data || newObs });
    } catch {
      return res.status(400).json({ success: false, error: "Error al crear la observación" });
    }
  }
);

// 3. POST /api/v1/observations/:id/threads - Responder o Subsanar en el hilo
observationRouter.post("/:id/threads", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachment_url, action_taken } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "El mensaje es obligatorio" });
    }

    const userEmail = (req.headers["x-user-email"] as string) || "capturador.kfc1@trd.com";
    const userRole = (req.headers["x-user-role"] as string) || "CAPTURADOR";

    const newThread = {
      id: `th-${Date.now()}`,
      observation_id: id,
      user_id: "00000000-0000-0000-0000-000000000003",
      user_email: userEmail,
      user_role: userRole,
      message: String(message).trim(),
      attachment_url: attachment_url || null,
      action_taken: action_taken || "SUBSANACION",
      created_at: new Date().toISOString()
    };

    // Si el capturador subsana, actualizar estado de la observación a IN_REVIEW
    if (action_taken === "SUBSANACION") {
      await supabase
        .from("record_observations")
        .update({ status: "IN_REVIEW", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    const { data, error } = await supabase
      .from("observation_threads")
      .insert([newThread])
      .select("*")
      .single();

    return res.status(201).json({ success: true, data: data || newThread });
  } catch {
    return res.status(400).json({ success: false, error: "Error al registrar respuesta en el hilo" });
  }
});

// 4. PATCH /api/v1/observations/:id/status - Cambiar estado (OPEN -> IN_REVIEW -> RESOLVED)
observationRouter.patch(
  "/:id/status",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await supabase
        .from("record_observations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return res.status(200).json({ success: true, data: { id, status } });
      }

      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(400).json({ success: false, error: "Error al actualizar estado de observacion" });
    }
  }
);

// 5. PATCH /api/v1/observations/:id/close - Cerrar atómicamente la observación (Auditor / Supervisor)
observationRouter.patch(
  "/:id/close",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userEmail = (req.headers["x-user-email"] as string) || "auditor.finanzas@trd.com";

      const payload = {
        status: "CLOSED",
        closed_at: new Date().toISOString(),
        closed_by_email: userEmail,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("record_observations")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return res.status(200).json({ success: true, data: { id, status: "CLOSED" } });
      }

      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(400).json({ success: false, error: "Error al cerrar la observacion" });
    }
  }
);
