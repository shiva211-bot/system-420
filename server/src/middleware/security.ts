import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { config } from "../config";

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cache-Control", "no-store");
  if (config.cookieSecure || config.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function rejectUnsafeMethods(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "TRACE" || req.method === "TRACK") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  next();
}

export function maintenanceGate(req: Request, res: Response, next: NextFunction): void {
  if (process.env.MAINTENANCE_MODE !== "true") {
    next();
    return;
  }
  if (req.path === "/api/health") {
    next();
    return;
  }
  res.setHeader("Retry-After", "3600");
  res.status(503).json({ error: "Service unavailable" });
}

export const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const type = typeof err === "object" && err && "type" in err ? String((err as { type?: string }).type) : "";
  if (type === "entity.too.large") {
    res.status(413).json({ error: "Payload too large" });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Malformed JSON" });
    return;
  }
  console.error("[gaiya] request error", err);
  res.status(500).json({ error: "Internal server error" });
};
