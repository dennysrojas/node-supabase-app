import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase.js";

export const auditCommentRoutes = Router();

/**
 * GET /api/v1/audit-comments
 * Obtener listado de comentarios de auditoría filtrado por tienda, año, mes y módulo
 */
auditCommentRoutes.get("/", async (req: Request, res: Response) => {
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
      return res.status(200).json({ success: true, data: [] });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch {
    return res.status(200).json({ success: true, data: [] });
  }
});

/**
 * POST /api/v1/audit-comments
 * Registrar una nueva observación / dictamen de auditoría
 */
auditCommentRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const { store_id, year, month, module_code, severity, comment } = req.body;

    if (!store_id || !year || !month || !module_code || !comment) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros obligatorios (store_id, year, month, module_code, comment)",
      });
    }

    const userEmail = req.headers["x-user-email"] || "auditor.finanzas@trd.com";
    const userRole = req.headers["x-user-role"] || "AUDITOR";

    const newEntry = {
      id: `comm-${Date.now()}`,
      store_id,
      year: Number(year),
      month: Number(month),
      module_code,
      user_id: "00000000-0000-0000-0000-000000000004",
      user_email: String(userEmail),
      user_role: String(userRole),
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
      return res.status(201).json({ success: true, data: newEntry });
    }

    return res.status(201).json({ success: true, data: data || newEntry });
  } catch {
    return res.status(400).json({ success: false, error: "Error al registrar comentario de auditoría" });
  }
});
