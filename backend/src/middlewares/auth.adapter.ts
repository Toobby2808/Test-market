import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

/** Roles used across the app */
type Role = "farmer" | "buyer" | "logistics" | "admin";

declare global {
  namespace Express {
    interface UserPayload {
      id?: string;
      _id?: string;
      role: Role;
      isVerified?: boolean;
      // add extras if needed later
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

// Determine whether to use the stub middleware
const USE_STUB = process.env.USE_AUTH_STUB === "true";

let authMiddlewareReal: (req: Request, res: Response, next: NextFunction) => void;
let authorizeRolesReal: (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;

if (!USE_STUB) {
  // Use real middleware (ensure the path is correct relative to this file)
  const mod = require("./auth.middleware");
  authMiddlewareReal = mod.authMiddleware;
  authorizeRolesReal = mod.authorizeRoles;
}

/** Stub auth middleware for local testing (when USE_AUTH_STUB=true) */
function authMiddlewareStub(req: Request, res: Response, next: NextFunction) {
  const raw = req.header("x-dev-user");
  if (!raw) {
    return res
      .status(401)
      .json({ message: "No x-dev-user header provided, or turn off USE_AUTH_STUB" });
  }

  try {
    req.user = JSON.parse(raw);
    next();
  } catch {
    return res.status(400).json({ message: "Invalid x-dev-user JSON" });
  }
}

/** Stub role authorizer for local testing */
function authorizeRolesStub(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export const authMiddleware = USE_STUB ? authMiddlewareStub : authMiddlewareReal;
export const authorizeRoles = USE_STUB ? authorizeRolesStub : authorizeRolesReal;
