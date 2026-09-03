import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { requireObservationRole } from "../middlewares/observationAuth.middleware.js";

export const auditCommentRoutes = Router();

// Aplicar autenticación JWT a todas las rutas de comentarios de auditoría
auditCommentRoutes.use(authMiddleware as RequestHandler);

/**
 * GET /api/v1/audit-comments
 * Obtener listado de comentarios de auditoría filtrado por tienda, año, mes y módulo
 */
auditCommentRoutes.get("/", (async (req: Request, res: Response) => {
  try {
    const { store_id, year, month, module_code } = req.query;

    let query = supabase
      .from("projection_audit_comments")
      .select("*")
      .order("created_at", { ascending: true });

    if (store_id) query = query.eq("store_id", String(store_id));
    if (year) query = query.eq("year", Number(year));
    if (month) query = query.eq("month", Number(month));
    if (module_code) query = query.eq("module_code", String(module_code));

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error al consultar comentarios de auditoría en Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: unknown) {
    console.error("❌ Excepción no controlada en GET /audit-comments:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno al procesar la solicitud en el servidor",
    });
  }
}) as RequestHandler);

/**
 * POST /api/v1/audit-comments
 * Registrar una nueva observación / dictamen de auditoría (Auditor, Supervisor, Admin)
 */
auditCommentRoutes.post(
  "/",
  requireObservationRole(["AUDITOR", "SUPERVISOR", "ADMIN_GLOBAL"]),
  (async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { store_id, year, month, module_code, severity, comment } = req.body;

      if (!store_id || !year || !month || !module_code || !comment) {
        return res.status(400).json({
          success: false,
          error: "Faltan parámetros obligatorios (store_id, year, month, module_code, comment)",
        });
      }

      const userEmail = authReq.userProfile?.email || authReq.user?.email || "auditor@trd.com";
      const userRole = authReq.userProfile?.global_role || "AUDITOR";
      const userId = authReq.user?.id || authReq.userProfile?.id;

      const newEntry = {
        id: `comm-${Date.now()}`,
        store_id,
        year: Number(year),
        month: Number(month),
        module_code,
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        severity: severity || "WARNING",
        comment: String(comment).trim(),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("projection_audit_comments")
        .insert([newEntry])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error al registrar comentario de auditoría en Supabase:", error);
        return res.status(500).json({
          success: false,
          error: "Error interno al procesar la solicitud en el servidor",
        });
      }

      return res.status(201).json({ success: true, data });
    } catch (err: unknown) {
      console.error("❌ Excepción no controlada en POST /audit-comments:", err);
      return res.status(500).json({
        success: false,
        error: "Error interno al procesar la solicitud en el servidor",
      });
    }
  }) as RequestHandler
);
