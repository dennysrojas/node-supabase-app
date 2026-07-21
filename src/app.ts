import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes.js';

export const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Endpoint de verificación de salud (health check)
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

// Registrar rutas bajo el prefijo /api
app.use('/api/products', productRoutes);

// Manejo de rutas no encontradas (404)
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});
