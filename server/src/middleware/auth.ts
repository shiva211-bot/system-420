import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { assertSession } from "../lib/session";

export interface AuthedRequest extends Request {
  auth?: JwtPayload;
}

export function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[config.cookieName];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  void (async () => {
    try {
      const token = extractToken(req);
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const payload = verifyToken(token);
      const session = await assertSession(payload);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }
      req.auth = session;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  })();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.auth || req.auth.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}
