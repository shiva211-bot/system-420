import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withMinDelay<T>(startedAt: number, minMs: number, value: T): Promise<T> {
  const wait = minMs - (Date.now() - startedAt);
  if (wait > 0) await sleep(wait);
  return value;
}
