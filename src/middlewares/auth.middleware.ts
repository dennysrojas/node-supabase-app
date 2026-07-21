import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase.js';

// Extensión de la interfaz Request de Express para incluir req.user de forma segura
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No autorizado' });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'No autorizado' });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'No autorizado' });
      return;
    }

    // Inyectamos el usuario autenticado en la petición
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'No autorizado' });
  }
}
