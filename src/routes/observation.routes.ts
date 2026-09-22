import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { requireObservationRole } from "../middlewares/observationAuth.middleware.js";

export const observationRouter = Router();

// Aplicar autenticación JWT a todas las rutas de observaciones
observationRouter.use(authMiddleware as RequestHandler);

// 1. GET /api/v1/observations - Obtener observaciones con filtros
observationRouter.get("/", (async (req: Request, res: Response) => {
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
      console.error("❌ Error al consultar observaciones en Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: unknown) {
    console.error("❌ Excepción no controlada en GET /observations:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno al procesar la solicitud en el servidor",
    });
  }
}) as RequestHandler);

// 2. POST /api/v1/observations - Crear un nuevo hallazgo / observación (Auditor, Supervisor, Admin)
observationRouter.post(
  "/",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  (async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { store_id, year, month, module_code, cell_key, title, description, severity } = req.body;

      if (!store_id || !year || !month || !module_code || !title || !description) {
        return res.status(400).json({
          success: false,
          error: "Campos obligatorios incompletos (store_id, year, month, module_code, title, description)",
        });
      }

      const userEmail = authReq.userProfile?.email || authReq.user?.email || "auditor@trd.com";
      const userRole = authReq.userProfile?.global_role || "AUDITOR";
      const userId = authReq.user?.id || authReq.userProfile?.id;
      const isUuid = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      const newObs: Record<string, unknown> = {
        store_id,
        year: Number(year),
        month: Number(month),
        module_code,
        cell_key: cell_key || null,
        title: String(title).trim(),
        description: String(description).trim(),
        severity: severity || "WARNING",
        status: "OPEN",
        created_by_email: userEmail,
        created_by_role: userRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isUuid) newObs.created_by_id = userId;

      const { data, error } = await supabase
        .from("record_observations")
        .insert([newObs])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error al persistir observación en Supabase:", error);
        return res.status(500).json({
          success: false,
          error: "Error interno al procesar la solicitud en el servidor",
        });
      }

      return res.status(201).json({ success: true, data });
    } catch (err: unknown) {
      console.error("❌ Excepción no controlada en POST /observations:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }
  }) as RequestHandler
);

// 3. POST /api/v1/observations/:id/threads - Responder o Subsanar en el hilo
observationRouter.post("/:id/threads", (async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { message, attachment_url, action_taken } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "El mensaje es obligatorio" });
    }

    // NEW-02: Validar inmutabilidad de expedientes cerrados
    const { data: existingObs, error: findError } = await supabase
      .from("record_observations")
      .select("status")
      .eq("id", id)
      .single();

    if (findError || !existingObs) {
      return res.status(404).json({ success: false, error: "Observación no encontrada" });
    }

    if (existingObs.status === "CLOSED") {
      return res.status(422).json({
        success: false,
        error: "Operación rechazada: El expediente se encuentra CERRADO (inmutable)",
      });
    }

    const userEmail = authReq.userProfile?.email || authReq.user?.email || "usuario@trd.com";
    const userRole = authReq.userProfile?.global_role || "CAPTURADOR";
    const userId = authReq.user?.id || authReq.userProfile?.id;

    const isUuid = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const newThread: Record<string, unknown> = {
      observation_id: id,
      user_email: userEmail,
      user_role: userRole,
      message: String(message).trim(),
      attachment_url: attachment_url || null,
      action_taken: action_taken || "SUBSANACION",
      created_at: new Date().toISOString()
    };
    if (isUuid) newThread.user_id = userId;

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

    if (error) {
      console.error("❌ Error al persistir hilo en Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (err: unknown) {
    console.error("❌ Excepción no controlada en POST /observations/:id/threads:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno al procesar la solicitud en el servidor",
    });
  }
}) as RequestHandler);

// 4. PATCH /api/v1/observations/:id - Corregir el hallazgo propio mientras no esté cerrado
observationRouter.patch(
  "/:id",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  (async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: "El título y la descripción son obligatorios",
        });
      }

      const { data: existingObs, error: findError } = await supabase
        .from("record_observations")
        .select("status, created_by_id, created_by_email")
        .eq("id", id)
        .single();

      if (findError || !existingObs) {
        return res.status(404).json({ success: false, error: "Observación no encontrada" });
      }

      if (existingObs.status === "CLOSED") {
        return res.status(422).json({
          success: false,
          error: "Operación rechazada: El expediente se encuentra CERRADO",
        });
      }

      const userId = authReq.user?.id || authReq.userProfile?.id;
      const userEmail = authReq.userProfile?.email || authReq.user?.email;
      const isAuthor = existingObs.created_by_id === userId || existingObs.created_by_email === userEmail;
      if (!isAuthor) {
        return res.status(403).json({
          success: false,
          error: "Solo el autor puede corregir este hallazgo",
        });
      }

      const { data, error } = await supabase
        .from("record_observations")
        .update({
          title: String(title).trim(),
          description: String(description).trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: "Error interno al procesar la solicitud en el servidor",
        });
      }

      return res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      console.error("❌ Excepción no controlada en PATCH /observations/:id:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }
  }) as RequestHandler
);

// 5. PATCH /api/v1/observations/:id/threads/:threadId - Corregir un comentario propio
observationRouter.patch("/:id/threads/:threadId", (async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id, threadId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: "El mensaje es obligatorio" });
    }

    const { data: existingObs, error: findError } = await supabase
      .from("record_observations")
      .select("status")
      .eq("id", id)
      .single();

    if (findError || !existingObs) {
      return res.status(404).json({ success: false, error: "Observación no encontrada" });
    }

    if (existingObs.status === "CLOSED") {
      return res.status(422).json({
        success: false,
        error: "Operación rechazada: El expediente se encuentra CERRADO",
      });
    }

    const { data: thread, error: threadError } = await supabase
      .from("observation_threads")
      .select("user_id, user_email")
      .eq("id", threadId)
      .eq("observation_id", id)
      .single();

    if (threadError || !thread) {
      return res.status(404).json({ success: false, error: "Comentario no encontrado" });
    }

    const userId = authReq.user?.id || authReq.userProfile?.id;
    const userEmail = authReq.userProfile?.email || authReq.user?.email;
    const isAuthor = thread.user_id === userId || thread.user_email === userEmail;
    if (!isAuthor) {
      return res.status(403).json({
        success: false,
        error: "Solo el autor puede corregir este comentario",
      });
    }

    const { data, error } = await supabase
      .from("observation_threads")
      .update({ message: String(message).trim() })
      .eq("id", threadId)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    console.error("❌ Excepción no controlada en PATCH /observations/:id/threads/:threadId:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno al procesar la solicitud en el servidor",
    });
  }
}) as RequestHandler);

// 6. PATCH /api/v1/observations/:id/status - Cambiar estado, reabrir o quitar resuelto
observationRouter.patch(
  "/:id/status",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  (async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: "El estado es requerido" });
      }

      // NEW-02: Validar inmutabilidad de expedientes cerrados
      const { data: existingObs, error: findError } = await supabase
        .from("record_observations")
        .select("status")
        .eq("id", id)
        .single();

      if (findError || !existingObs) {
        return res.status(404).json({ success: false, error: "Observación no encontrada" });
      }

      if (existingObs.status === "CLOSED" && status !== "OPEN") {
        return res.status(422).json({
          success: false,
          error: "Operación rechazada: El expediente se encuentra CERRADO. Solo se puede reabrir.",
        });
      }

      const nextStatus = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === "OPEN"
          ? { closed_at: null, closed_by_email: null }
          : {}),
      };

      const { data, error } = await supabase
        .from("record_observations")
        .update(nextStatus)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error al actualizar estado en Supabase:", error);
        return res.status(500).json({
          success: false,
          error: "Error interno al procesar la solicitud en el servidor",
        });
      }

      return res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      console.error("❌ Excepción no controlada en PATCH /observations/:id/status:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }
  }) as RequestHandler
);

// 5. PATCH /api/v1/observations/:id/close - Cerrar atómicamente la observación (Auditor / Supervisor)
observationRouter.patch(
  "/:id/close",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  (async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params;

      // Validar si la observación existe y si ya está cerrada
      const { data: existingObs, error: findError } = await supabase
        .from("record_observations")
        .select("status")
        .eq("id", id)
        .single();

      if (findError || !existingObs) {
        return res.status(404).json({ success: false, error: "Observación no encontrada" });
      }

      if (existingObs.status === "CLOSED") {
        return res.status(422).json({
          success: false,
          error: "Operación rechazada: El expediente ya se encuentra CERRADO",
        });
      }

      const userEmail = authReq.userProfile?.email || authReq.user?.email || "auditor@trd.com";

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
        console.error("❌ Error al cerrar observación en Supabase:", error);
        return res.status(500).json({
          success: false,
          error: "Error interno al procesar la solicitud en el servidor",
        });
      }

      return res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      console.error("❌ Excepción no controlada en PATCH /observations/:id/close:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }
  }) as RequestHandler
);
