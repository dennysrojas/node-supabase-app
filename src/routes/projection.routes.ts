import { Router } from "express";
import type { RequestHandler } from "express";
import { projectionController } from "../controllers/projection.controller.js";

const projectionRouter = Router();

// 1. Obtener catálogo de rubros P&L
projectionRouter.get(
  "/account-items",
  projectionController.getAccountItems as RequestHandler,
);

// 2. NUEVA RUTA: Obtener listado de locales / tiendas KFC
projectionRouter.get(
  "/stores",
  projectionController.getStores as RequestHandler,
);

// 3. Obtener proyección guardada por tienda
projectionRouter.get(
  "/store/:storeId",
  projectionController.getProjection as RequestHandler,
);

// 4. Crear o actualizar proyección
projectionRouter.post(
  "/",
  projectionController.createProjection as RequestHandler,
);

export default projectionRouter;
