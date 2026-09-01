import { Request, Response, NextFunction } from "express";

export interface AuthenticatedUserRequest extends Request {
  userRole?: string;
  userEmail?: string;
}

export const requireObservationRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    const role = (req.headers["x-user-role"] as string) || "CAPTURADOR";

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      });
    }

    req.userRole = role;
    req.userEmail = (req.headers["x-user-email"] as string) || "usuario@kfc.com.ec";
    return next();
  };
};
