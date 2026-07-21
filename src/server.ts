import { app } from './app.js';
import { env } from './config/supabase.js';

const port = env.PORT;
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📌 Health check disponible en http://localhost:${port}/health`);
  console.log(`📦 Productos API disponible en http://localhost:${port}/api/products`);
});
