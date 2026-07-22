import type { Request, Response } from 'express';
import { ProductService } from '../services/product.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const uuidSchema = z.string().uuid({ message: 'El ID proporcionado no es un UUID válido' });

const createProductSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio' }),
  price: z.number().positive({ message: 'El precio debe ser un número positivo' }),
});

const updateProductSchema = z
  .object({
    name: z.string().min(1, { message: 'El nombre no puede estar vacío' }).optional(),
    price: z.number().positive({ message: 'El precio debe ser un número positivo' }).optional(),
  })
  .refine((data) => data.name !== undefined || data.price !== undefined, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export class ProductController {
  /**
   * Obtiene todos los productos de forma pública.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const products = await ProductService.getAll();
      res.status(200).json({ success: true, data: products });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Obtiene un producto por ID de forma pública.
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        res.status(400).json({ success: false, error: 'El ID proporcionado no es un UUID válido' });
        return;
      }

      const product = await ProductService.getById(id);
      if (!product) {
        res.status(404).json({ success: false, error: 'Producto no encontrado' });
        return;
      }

      res.status(200).json({ success: true, data: product });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Crea un producto (requiere autenticación).
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'No autorizado' });
        return;
      }

      const validation = createProductSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.issues.map((e) => e.message).join(', '),
        });
        return;
      }

      const product = await ProductService.create({
        user_id: user.id,
        name: validation.data.name,
        price: validation.data.price,
      });

      res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Actualiza un producto (requiere autenticación y propiedad).
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'No autorizado' });
        return;
      }

      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        res.status(400).json({ success: false, error: 'El ID proporcionado no es un UUID válido' });
        return;
      }

      const validation = updateProductSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.issues.map((e) => e.message).join(', '),
        });
        return;
      }

      const existingProduct = await ProductService.getById(id);
      if (!existingProduct) {
        res.status(404).json({ success: false, error: 'Producto no encontrado' });
        return;
      }

      if (existingProduct.user_id !== user.id) {
        res.status(403).json({ success: false, error: 'No autorizado para modificar este producto' });
        return;
      }

      const updateData: { name?: string; price?: number } = {};
      if (validation.data.name !== undefined) {
        updateData.name = validation.data.name;
      }
      if (validation.data.price !== undefined) {
        updateData.price = validation.data.price;
      }

      const updated = await ProductService.update(id, user.id, updateData);
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Elimina un producto (requiere autenticación y propiedad).
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'No autorizado' });
        return;
      }

      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        res.status(400).json({ success: false, error: 'El ID proporcionado no es un UUID válido' });
        return;
      }

      const existingProduct = await ProductService.getById(id);
      if (!existingProduct) {
        res.status(404).json({ success: false, error: 'Producto no encontrado' });
        return;
      }

      if (existingProduct.user_id !== user.id) {
        res.status(403).json({ success: false, error: 'No autorizado para eliminar este producto' });
        return;
      }

      await ProductService.delete(id, user.id);
      res.status(200).json({ success: true, data: { id } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      res.status(500).json({ success: false, error: message });
    }
  }
}
