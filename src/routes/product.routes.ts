import { Router } from 'express';
import type { RequestHandler } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.get('/', ProductController.getAll as RequestHandler);
router.get('/:id', ProductController.getById as RequestHandler);

// Rutas protegidas (requieren autenticación JWT)
router.post('/', authMiddleware as RequestHandler, ProductController.create as RequestHandler);
router.put('/:id', authMiddleware as RequestHandler, ProductController.update as RequestHandler);
router.delete('/:id', authMiddleware as RequestHandler, ProductController.delete as RequestHandler);

export default router;
