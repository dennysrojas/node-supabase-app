import { Router } from "express";
import type { RequestHandler } from "express";
import { projectionController } from "../controllers/projection.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireModuleScope } from "../middlewares/scope.middleware.js";

const projectionRouter = Router();

// 1. Obtener catálogo de rubros P&L
projectionRouter.get(
  "/account-items",
  authMiddleware as RequestHandler,
  projectionController.getAccountItems as RequestHandler,
);

// 2. Obtener listado de locales / tiendas KFC
projectionRouter.get(
  "/stores",
  authMiddleware as RequestHandler,
  projectionController.getStores as RequestHandler,
);

// 3. Obtener proyección guardada por tienda y periodo
projectionRouter.get(
  "/store/:storeId",
  authMiddleware as RequestHandler,
  requireModuleScope("PYG", ["CAPTURADOR", "SUPERVISOR", "ADMIN_GLOBAL", "AUDITOR"]) as RequestHandler,
  projectionController.getProjection as RequestHandler,
);

// 🆕 NUEVA RUTA: Obtener proyección del año completo (12 meses)
projectionRouter.get(
  "/store/:storeId/year/:year",
  authMiddleware as RequestHandler,
  requireModuleScope("PYG", ["CAPTURADOR", "SUPERVISOR", "ADMIN_GLOBAL", "AUDITOR"]) as RequestHandler,
  projectionController.getYearlyProjection as RequestHandler,
);

// 5. Crear o actualizar proyección
projectionRouter.post(
  "/",
  authMiddleware as RequestHandler,
  requireModuleScope("PYG", ["CAPTURADOR", "SUPERVISOR", "ADMIN_GLOBAL"]) as RequestHandler,
  projectionController.createProjection as RequestHandler,
);

export default projectionRouter;
