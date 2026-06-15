import { Request, Response, NextFunction } from "express";
import type { AppUser } from "@repo/shared";

export interface AuthenticatedRequest extends Request {
  user?: AppUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Placeholder - will implement with JWT
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Placeholder - will implement with role check
  next();
}