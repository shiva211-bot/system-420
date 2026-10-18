import { timingSafeEqual } from "crypto";
import { redis } from "./redis";
import { randomToken } from "./cryptoTokens";

export const OTP_LOCK_SEC = 4 * 60 * 60;
const TICKET_TTL_SEC = 7 * 24 * 60 * 60;
const GENERIC_OTP = "Invalid OTP";

type TicketPayload = { userId?: string; dummy?: boolean };

export function istDateOtp(at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(at);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  return `${day}${String(year).slice(-2)}${String(month)[0] ?? "0"}`;
}

export function otpMatches(input: string, expected: string): boolean {
  const left = Buffer.from(String(input).trim());
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(Buffer.alloc(32, 0), Buffer.alloc(32, 1));
    return false;
  }
  return timingSafeEqual(left, right);
}

function ticketKey(ticket: string) {
  return `nexus:otp:ticket:${ticket}`;
}
function failsKey(ticket: string) {
  return `nexus:otp:fails:${ticket}`;
}
function modeKey(ticket: string) {
  return `nexus:otp:mode:${ticket}`;
}
function lockKey(ticket: string) {
  return `nexus:otp:lock:${ticket}`;
}

export async function issueOtpTicket(userId: string | null): Promise<string> {
  const ticket = randomToken();
  const payload: TicketPayload = userId ? { userId } : { dummy: true };
  await redis.set(ticketKey(ticket), JSON.stringify(payload), "EX", TICKET_TTL_SEC);
  return ticket;
}

export async function readOtpTicket(ticket: string): Promise<TicketPayload | null> {
  const raw = await redis.get(ticketKey(ticket));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TicketPayload;
  } catch {
    return null;
  }
}

export async function otpLockTtl(ticket: string): Promise<number> {
  const ttl = await redis.ttl(lockKey(ticket));
  return ttl > 0 ? ttl : 0;
}

export async function beginOtpAttempt(ticket: string): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const locked = await otpLockTtl(ticket);
  if (locked > 0) return { ok: false, retryAfter: locked };
  return { ok: true };
}

export async function recordOtpFailure(ticket: string): Promise<{ locked: boolean; retryAfter: number }> {
  const mode = await redis.get(modeKey(ticket));
  if (mode === "interval") {
    await redis.set(lockKey(ticket), "1", "EX", OTP_LOCK_SEC);
    return { locked: true, retryAfter: OTP_LOCK_SEC };
  }
  const n = await redis.incr(failsKey(ticket));
  if (n === 1) await redis.expire(failsKey(ticket), TICKET_TTL_SEC);
  if (n >= 3) {
    await redis.set(modeKey(ticket), "interval", "EX", TICKET_TTL_SEC);
    await redis.set(lockKey(ticket), "1", "EX", OTP_LOCK_SEC);
    return { locked: true, retryAfter: OTP_LOCK_SEC };
  }
  return { locked: false, retryAfter: 0 };
}

export async function consumeOtpTicket(ticket: string): Promise<void> {
  await redis.del(ticketKey(ticket), failsKey(ticket), modeKey(ticket), lockKey(ticket));
}

export const OTP_ERROR = GENERIC_OTP;
