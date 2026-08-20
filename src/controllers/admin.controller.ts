import type { Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import {
  createUserSchema,
  updateUserSchema,
  assignScopeSchema,
  queryAuditLogsSchema
} from '../schemas/admin.schema.js';
import type { ScopedRequest } from '../middlewares/scope.middleware.js';

export class AdminController {
  /**
   * GET /api/v1/users (o /api/users)
   */
  static async listUsers(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const { role, active } = req.query;
      const filterActive = active !== undefined ? active === 'true' : undefined;

      const users = await AdminService.listUsers(role as string, filterActive);
      res.json({
        success: true,
        data: users
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno al listar usuarios';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * GET /api/v1/users/:id (o /api/users/:id)
   */
  static async getUserById(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await AdminService.getUserById(id);
      res.json({
        success: true,
        data: user
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Usuario no encontrado';
      res.status(404).json({ success: false, error: message });
    }
  }

  /**
   * POST /api/v1/users (o /api/users)
   */
  static async createUser(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const parseResult = createUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Payload inválido',
          details: parseResult.error.errors
        });
        return;
      }

      const adminUserId = req.user?.id;
      const user = await AdminService.createUser(parseResult.data, adminUserId);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * PUT /api/v1/users/:id (o /api/users/:id)
   */
  static async updateUser(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parseResult = updateUserSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Payload inválido',
          details: parseResult.error.errors
        });
        return;
      }

      const adminUserId = req.user?.id;
      const updatedUser = await AdminService.updateUser(id, parseResult.data, adminUserId);

      res.json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: updatedUser
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar usuario';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * GET /api/v1/scopes (o /api/scopes)
   */
  static async listScopes(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const { user_id, module_code } = req.query;
      const scopes = await AdminService.listScopes(user_id as string, module_code as string);

      res.json({
        success: true,
        data: scopes
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al listar alcances';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * POST /api/v1/scopes (o /api/scopes)
   */
  static async assignScope(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const parseResult = assignScopeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Payload inválido',
          details: parseResult.error.errors
        });
        return;
      }

      const assignedByUserId = req.user?.id;
      const scope = await AdminService.assignScope(parseResult.data, assignedByUserId);

      res.status(201).json({
        success: true,
        message: 'Alcance asignado exitosamente',
        data: scope
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al asignar alcance';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * DELETE /api/v1/scopes/:id (o /api/scopes/:id)
   */
  static async revokeScope(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const revokedByUserId = req.user?.id;
      const revokedScope = await AdminService.revokeScope(id, revokedByUserId);

      res.json({
        success: true,
        message: 'Alcance revocado exitosamente',
        data: revokedScope
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al revocar alcance';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * GET /api/v1/audit (o /api/audit)
   */
  static async queryAuditLogs(req: ScopedRequest, res: Response): Promise<void> {
    try {
      const parseResult = queryAuditLogsSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: parseResult.error.errors
        });
        return;
      }

      const result = await AdminService.queryAuditLogs(parseResult.data);

      res.json({
        success: true,
        ...result
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al consultar logs de auditoría';
      res.status(500).json({ success: false, error: message });
    }
  }
}
