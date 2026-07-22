import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes.js';
import projectionRouter from './routes/projection.routes.js';

export const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud (health check)
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

// Registrar rutas de la API de productos
app.use('/api/products', productRoutes);

// Registrar el módulo de proyecciones financieras
app.use('/api/v1/projections', projectionRouter);

// Handler global para rutas no encontradas (404)
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Manejo global de errores inesperados (500)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Error no capturado:', err);
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  res.status(500).json({ success: false, error: message });
});

export default app;
