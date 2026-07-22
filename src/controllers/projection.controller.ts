import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createProjectionSchema } from "../schemas/projection.schema.js";
import { projectionService } from "../services/projection.service.js";

export class ProjectionController {
  /**
   * POST /api/v1/projections
   * Guarda una proyección financiera completa
   */
  async createProjection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // 1. Validar el payload de entrada contra el esquema de Zod
      const validatedData = createProjectionSchema.parse(req.body);

      // 2. Obtener el ID del usuario si viene autenticado
      const userId = (req as { user?: { id: string } }).user?.id;

      // 3. Ejecutar la persistencia en el servicio
      const projection = await projectionService.createProjection(
        validatedData,
        userId,
      );

      // 4. Responder con código HTTP 201
      res.status(201).json({
        success: true,
        message: "Proyección financiera guardada exitosamente",
        data: projection,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Error de validación en la petición",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      next(error);
    }
  }

  /**
   * GET /api/v1/projections/account-items
   * Obtiene la plantilla de cuentas para construir la interfaz
   */
  async getAccountItems(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const items = await projectionService.getAccountItems();
      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/projections/store/:storeId?year=2026&month=7&scenario=BASE
   * Consulta el P&L completo de una tienda específica
   */
  async getProjection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { storeId } = req.params;
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const scenario = (req.query.scenario as string) || "BASE";

      if (!storeId) {
        res.status(400).json({
          success: false,
          error: "El ID del local (storeId) es requerido en la ruta",
        });
        return;
      }

      const projection = await projectionService.getProjectionByStoreAndPeriod(
        storeId,
        year,
        month,
        scenario,
      );

      if (!projection) {
        res.status(404).json({
          success: false,
          message: `No se encontró proyección para el local en el periodo ${month}/${year} (${scenario})`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: projection,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectionController = new ProjectionController();
