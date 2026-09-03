import { Router, RequestHandler } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authMiddleware, requireGlobalRole } from '../middlewares/auth.middleware.js';

export const userRoutes = Router();
export const scopeRoutes = Router();
export const auditRoutes = Router();

// =============================================================================
// 1. RUTAS DE ADMINISTRACIÓN DE USUARIOS (/api/users o /api/v1/users)
// =============================================================================
userRoutes.get(
  '/',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR']) as RequestHandler,
  AdminController.listUsers as RequestHandler
);

userRoutes.get(
  '/:id',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR']) as RequestHandler,
  AdminController.getUserById as RequestHandler
);

userRoutes.post(
  '/',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL']) as RequestHandler,
  AdminController.createUser as RequestHandler
);

userRoutes.put(
  '/:id',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL']) as RequestHandler,
  AdminController.updateUser as RequestHandler
);

// =============================================================================
// 2. RUTAS DE ASIGNACIÓN DE ALCANCES (/api/scopes o /api/v1/scopes)
// =============================================================================
scopeRoutes.get(
  '/',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR']) as RequestHandler,
  AdminController.listScopes as RequestHandler
);

scopeRoutes.post(
  '/',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR']) as RequestHandler,
  AdminController.assignScope as RequestHandler
);

scopeRoutes.delete(
  '/:id',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR']) as RequestHandler,
  AdminController.revokeScope as RequestHandler
);

// =============================================================================
// 3. RUTAS DE CONSULTA DE AUDITORÍA (/api/audit o /api/v1/audit)
// =============================================================================
auditRoutes.get(
  '/',
  authMiddleware as RequestHandler,
  requireGlobalRole(['ADMIN_GLOBAL', 'SUPERVISOR', 'AUDITOR']) as RequestHandler,
  AdminController.queryAuditLogs as RequestHandler
);
