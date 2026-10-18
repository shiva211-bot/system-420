import type { Request } from "express";
import { redis } from "./redis";

export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return { ok: n <= limit, remaining: Math.max(0, limit - n) };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const result = await rateLimit(key, limit, windowSec);
  return result.ok;
}

export async function readCounter(key: string): Promise<number> {
  const value = await redis.get(key);
  return value ? Number(value) : 0;
}

export async function recordFailure(key: string, windowSec: number): Promise<number> {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n;
}

export async function clearCounter(key: string): Promise<void> {
  await redis.set(key, "0");
  await redis.expire(key, 1);
}
