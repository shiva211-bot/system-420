import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  jwtSecret: required("JWT_SECRET", "dev-only-change-me-nexus-jwt-secret-32chars"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.AUTH_COOKIE_NAME ?? "nexus_token",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  publicUrl: (() => {
    const raw = (process.env.PUBLIC_URL ?? "").trim();
    if (raw && raw !== "*") return raw.replace(/\/$/, "");
    const cors = (process.env.CORS_ORIGIN ?? "").split(",")[0].trim();
    if (cors && cors !== "*") return cors.replace(/\/$/, "");
    return "http://localhost:3000";
  })(),
  worldHistoryLimit: Number(process.env.WORLD_HISTORY_LIMIT ?? 150),
  dmHistoryLimit: Number(process.env.DM_HISTORY_LIMIT ?? 200),
  messageTtlMs: Number(process.env.MESSAGE_TTL_MS ?? 60 * 60 * 1000),
  maxMessageLength: Number(process.env.MAX_MESSAGE_LENGTH ?? 2000),
  xpPerMessage: 8,
  xpPerTransfer: 15,
  smtpHost: process.env.SMTP_HOST ?? "",
  authMinDelayMs: Number(process.env.AUTH_MIN_DELAY_MS ?? 450),
  loginIpLimit: Number(process.env.LOGIN_IP_LIMIT ?? 8),
  loginIdLimit: Number(process.env.LOGIN_ID_LIMIT ?? 5),
  loginWindowSec: Number(process.env.LOGIN_WINDOW_SEC ?? 15 * 60),
  verifyTtlMs: Number(process.env.VERIFY_TTL_MS ?? 24 * 60 * 60 * 1000),
  resetTtlMs: Number(process.env.RESET_TTL_MS ?? 60 * 60 * 1000),
  businessName: process.env.BUSINESS_NAME ?? "Gaiya System",
  businessLegalName: process.env.BUSINESS_LEGAL_NAME ?? "Gaiya System",
  businessAddress: process.env.BUSINESS_ADDRESS ?? "India",
  businessEmail: process.env.BUSINESS_EMAIL ?? "privacy@gaiya.system",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@gaiya.system",
};
