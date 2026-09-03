import type { Response, NextFunction, RequestHandler } from "express";
import type { AuthenticatedRequest, UserProfile } from "./auth.middleware.js";

export interface AuthenticatedUserRequest extends AuthenticatedRequest {
  userRole?: string;
  userEmail?: string;
}

export const requireObservationRole = (
  allowedRoles: Array<UserProfile["global_role"] | string>,
): RequestHandler => {
  return (req: AuthenticatedUserRequest, res: Response, next: NextFunction): void => {
    // 1. Garantizar que la petición pasó previamente por authMiddleware
    if (!req.user || !req.userProfile) {
      res.status(401).json({
        success: false,
        error: "No autorizado: Se requiere sesión válida y perfil de usuario",
      });
      return;
    }

    // 2. Extraer rol y estado exclusivamente desde el perfil de base de datos verificado
    const { global_role, is_active, email } = req.userProfile;

    if (!is_active) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado: Usuario inactivo en el sistema",
      });
      return;
    }

    if (!allowedRoles.includes(global_role)) {
      res.status(403).json({
        success: false,
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    req.userRole = global_role;
    req.userEmail = email || req.user.email || "";
    next();
  };
};
