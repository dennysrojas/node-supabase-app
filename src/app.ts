import express from "express";
import cors from "cors";
import productRoutes from "./routes/product.routes.js";
import projectionRouter from "./routes/projection.routes.js";
import salesProjectionsRouter from "./routes/salesProjections.routes.js";
import { userRoutes, scopeRoutes, auditRoutes } from "./routes/admin.routes.js";
import { auditCommentRoutes } from "./routes/auditComment.routes.js";
import { observationRouter } from "./routes/observation.routes.js";
import { auditInterceptorMiddleware } from "./middlewares/auditInterceptor.middleware.js";

export const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "https://kfc-projections-frontend.vercel.app",
  "https://trd-projections-frontend.vercel.app",
]);

// Expresión regular estricta para deployments de preview autorizados del equipo TRD
const allowedPreviewPattern =
  /^https:\/\/(?:[a-zA-Z0-9_-]+-)?(?:kfc-projections|trd-projections)-[a-zA-Z0-9_-]+\.vercel\.app$/;

// Middlewares globales
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (ej. herramientas internas, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin) || allowedPreviewPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Acceso bloqueado por política de CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(auditInterceptorMiddleware as express.RequestHandler);

// Endpoint de verificación de salud (health check)
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

// Registrar rutas de la API de productos
app.use("/api/products", productRoutes);

// Registrar el módulo de proyecciones financieras
app.use("/api/v1/projections", projectionRouter);
app.use("/api/v1/sales-projections", salesProjectionsRouter);

// Registrar rutas de administración de usuarios, alcances y auditoría
app.use("/api/users", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/scopes", scopeRoutes);
app.use("/api/v1/scopes", scopeRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/audit-comments", auditCommentRoutes);
app.use("/api/v1/audit-comments", auditCommentRoutes);
app.use("/api/observations", observationRouter);
app.use("/api/v1/observations", observationRouter);

// Handler global para rutas no encontradas (404)
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada" });
});

// Manejo global de errores inesperados (500)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("❌ Error no capturado:", err);
    const isProduction = process.env.NODE_ENV === "production";
    const message = isProduction
      ? "Error interno del servidor"
      : err instanceof Error
        ? err.message
        : "Error interno del servidor";
    res.status(500).json({ success: false, error: message });
  },
);

export default app;
