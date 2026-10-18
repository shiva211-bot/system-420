import type { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken, verifyToken } from "../lib/jwt";
import { publicUser } from "../lib/serializers";
import { clearAuthCookie, extractToken, setAuthCookie, type AuthedRequest } from "../middleware/auth";
import { STARTING_WALLET } from "../lib/currency";
import { generateUniqueUsername } from "../lib/username";
import { AREAS, BLOOD_TYPES, COUNTRIES, GENDERS, REGIONS, STATES } from "../lib/geo";
import { dropUserPresence, purgeUser } from "../lib/accounts";
import type { Server } from "socket.io";
import { config } from "../config";
import { clearCounter, clientIp, enforceRateLimit, readCounter, recordFailure } from "../lib/rateLimit";
import { withMinDelay } from "../lib/cryptoTokens";
import { consumeAuthToken, issueAuthToken } from "../lib/authTokens";
import { bumpTokenVersion, cacheSession, dropSessionCache } from "../lib/session";
import { existingAccountEmailBody, resetEmailBody, sendMail } from "../lib/mail";
import {
  beginOtpAttempt,
  consumeOtpTicket,
  issueOtpTicket,
  istDateOtp,
  OTP_ERROR,
  OTP_LOCK_SEC,
  otpLockTtl,
  otpMatches,
  readOtpTicket,
  recordOtpFailure,
} from "../lib/otp";

const DUMMY_HASH = "$2a$12$HayGWeaxIZjMV18I3Tv3UuGnAHZykhjFW7GlI64ZkGi3gDt63ocjO";
const GENERIC_AUTH = "Unable to complete that request. Try again later.";
const GENERIC_SENT = "If an account exists for that email, we sent instructions.";

const registerSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  bio: z.string().max(280).optional(),
  realName: z.string().min(2).max(80),
  gender: z.enum(GENDERS),
  age: z.number().int().min(18).max(99),
  bloodType: z.enum(BLOOD_TYPES).optional().or(z.literal("")),
  country: z.enum(COUNTRIES),
  state: z.enum(STATES),
  region: z.enum(REGIONS),
  area: z.enum(AREAS),
  partnerUsername: z.string().min(3).max(32).optional().or(z.literal("")),
  ageConfirmed: z.literal(true),
  privacyAccepted: z.literal(true),
  termsAccepted: z.literal(true),
});

const loginSchema = z.object({
  identifier: z.string().min(3).max(120),
  password: z.string().min(8).max(128),
});

const emailSchema = z.object({
  email: z.string().email().max(120),
});

const otpSchema = z.object({
  ticket: z.string().min(16).max(128),
  otp: z.string().min(4).max(12),
});

const resetSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
});

const deletionSchema = z.object({
  email: z.string().email().max(120),
  reason: z.string().max(500).optional(),
});

async function withRelations(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    include: { activeTitle: true, partner: { select: { username: true, gender: true } }, titles: { include: { title: true } } },
  });
}

function publicOrigin(): string {
  const url = config.publicUrl.split(",")[0].trim();
  return url.replace(/\/$/, "");
}

function issueSession(user: { id: string; username: string; role: string; tokenVersion: number; status: string }) {
  const token = signToken({ userId: user.id, username: user.username, role: user.role, tv: user.tokenVersion });
  void cacheSession(user.id, user.tokenVersion, user.status);
  return token;
}

export async function register(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors)[0];
    const message = first ? `${first[0]}: ${first[1]?.[0] ?? "invalid"}` : "Invalid registration payload";
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: message, details: { fieldErrors } });
    return;
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const notice = existingAccountEmailBody();
    await sendMail(email, notice.subject, notice.text);
    const ticket = await issueOtpTicket(existing.emailVerified || existing.status !== "ACTIVE" ? null : existing.id);
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(201).json({
      ok: true,
      pending: true,
      ticket,
      message: "Enter the date OTP to activate the operator.",
    });
    return;
  }

  let partnerId: string | null = null;
  if (data.gender === "MALE") {
    const handle = (data.partnerUsername ?? "").trim();
    if (!handle) {
      await withMinDelay(started, config.authMinDelayMs, null);
      res.status(400).json({ error: "Male players must enter an enrolled female partner username" });
      return;
    }
    const partner = await prisma.user.findUnique({ where: { username: handle } });
    if (!partner || partner.status !== "ACTIVE" || partner.gender !== "FEMALE" || partner.partnerId) {
      await withMinDelay(started, config.authMinDelayMs, null);
      res.status(400).json({ error: "Partner username is not available" });
      return;
    }
    partnerId = partner.id;
  }

  const username = await generateUniqueUsername();
  const passwordHash = await bcrypt.hash(data.password, 12);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: "USER",
          position: "PLAYER",
          ...STARTING_WALLET,
          bio: data.bio ?? "",
          equippedBadge: "none",
          realName: data.realName.trim(),
          gender: data.gender,
          age: data.age,
          bloodType: data.bloodType ?? "",
          country: data.country,
          state: data.state,
          region: data.region,
          area: data.area,
          status: "ACTIVE",
          emailVerified: null,
          tokenVersion: 0,
          ...(partnerId ? { partner: { connect: { id: partnerId } } } : {}),
        },
      });
      if (partnerId) {
        await tx.user.update({ where: { id: partnerId }, data: { partner: { connect: { id: user.id } } } });
      }
      return user;
    });
    const ticket = await issueOtpTicket(created.id);
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(201).json({
      ok: true,
      pending: true,
      ticket,
      message: "Enter the date OTP to activate the operator.",
    });
  } catch {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(500).json({ error: GENERIC_AUTH });
  }
}

export async function login(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const ip = clientIp(req);
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }
  const identifier = parsed.data.identifier.trim();
  const idKey = identifier.toLowerCase();
  const ipFailKey = `nexus:rl:login:ip:${ip}`;
  const idFailKey = `nexus:rl:login:id:${idKey}`;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
    },
    include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
  });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(parsed.data.password, hash);

  if (user && passwordOk && user.status === "ACTIVE" && user.emailVerified) {
    await Promise.all([clearCounter(ipFailKey), clearCounter(idFailKey)]);
    const token = issueSession(user);
    setAuthCookie(res, token);
    await withMinDelay(started, config.authMinDelayMs, null);
    res.json({ token, user: publicUser(user, { id: user.id, role: user.role, position: user.position }) });
    return;
  }

  if (user && passwordOk) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const [ipFails, idFails] = await Promise.all([readCounter(ipFailKey), readCounter(idFailKey)]);
  if (ipFails >= config.loginIpLimit || idFails >= config.loginIdLimit) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.setHeader("Retry-After", String(config.loginWindowSec));
    res.status(429).json({ error: GENERIC_AUTH });
    return;
  }
  await Promise.all([
    recordFailure(ipFailKey, config.loginWindowSec),
    recordFailure(idFailKey, config.loginWindowSec),
  ]);
  await withMinDelay(started, config.authMinDelayMs, null);
  res.status(401).json({ error: "Invalid credentials" });
}

export async function logout(req: AuthedRequest, res: Response): Promise<void> {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      await bumpTokenVersion(payload.userId);
    } catch {
      /* already invalid */
    }
  }
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await withRelations(req.auth.userId).catch(() => null);
  if (!user || user.status !== "ACTIVE") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({
    user: publicUser(user, { id: user.id, role: user.role, position: user.position }),
    titles: user.titles.map((t) => ({
      id: t.title.id,
      name: t.title.name,
      description: t.title.description,
      badgeId: t.title.badgeId,
      unlockedAt: t.unlockedAt.toISOString(),
    })),
  });
}

export async function options(_req: AuthedRequest, res: Response): Promise<void> {
  res.json({
    countries: COUNTRIES.map((id) => ({ id, label: id === "INDIA" ? "India" : "Australia" })),
    states: STATES.map((id) => ({
      id,
      label:
        id === "UTTAR_PRADESH"
          ? "Uttar Pradesh (UP)"
          : id === "ODISHA"
            ? "Odisha"
            : id === "MADHYA_PRADESH"
              ? "Madhya Pradesh"
              : id === "MAHARASHTRA"
                ? "Maharashtra"
                : id === "WEST_BENGAL"
                  ? "West Bengal"
                  : "Gujarat",
    })),
    regions: REGIONS.map((id) => ({
      id,
      label: id === "TRISHUL" ? "1 (Trishul)" : id === "SUDARSHAN" ? "2 (Sudarshan)" : "3 (Astra)",
    })),
    areas: AREAS.map((id) => ({ id, label: id === "OUTER" ? "Outer" : id === "INNER" ? "Inner" : "Core" })),
    genders: GENDERS.map((id) => ({ id, label: id === "MALE" ? "Male" : "Female" })),
    bloodTypes: BLOOD_TYPES,
  });
}

export async function verifyOtp(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const ip = clientIp(req);
  if (!(await enforceRateLimit(`nexus:rl:otp:ip:${ip}`, 20, 3600))) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.setHeader("Retry-After", "3600");
    res.status(429).json({ error: GENERIC_AUTH });
    return;
  }
  const parsed = otpSchema.safeParse(req.body);
  if (!parsed.success) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  const { ticket, otp } = parsed.data;
  const payload = await readOtpTicket(ticket);
  if (!payload) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  const gate = await beginOtpAttempt(ticket);
  if (!gate.ok) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.setHeader("Retry-After", String(gate.retryAfter));
    res.status(429).json({ error: "OTP locked. Wait four hours.", retryAfter: gate.retryAfter });
    return;
  }
  const expected = istDateOtp();
  const match = otpMatches(otp, expected);
  const userId = payload.userId;
  if (!match || !userId) {
    const fail = await recordOtpFailure(ticket);
    await withMinDelay(started, config.authMinDelayMs, null);
    if (fail.locked) {
      res.setHeader("Retry-After", String(fail.retryAfter));
      res.status(429).json({ error: "OTP locked. Wait four hours.", retryAfter: fail.retryAfter });
      return;
    }
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    await recordOtpFailure(ticket);
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await consumeOtpTicket(ticket);
  await withMinDelay(started, config.authMinDelayMs, null);
  res.json({
    ok: true,
    username: user.username,
    message: `Operator activated. Assigned handle is ${user.username}. Sign in with your email.`,
  });
}

export async function otpStatus(req: AuthedRequest, res: Response): Promise<void> {
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  if (ticket.length < 16) {
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  const payload = await readOtpTicket(ticket);
  if (!payload) {
    res.status(400).json({ error: OTP_ERROR });
    return;
  }
  const retryAfter = await otpLockTtl(ticket);
  res.json({ ok: true, locked: retryAfter > 0, retryAfter, lockSec: OTP_LOCK_SEC });
}

export async function forgotPassword(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const ip = clientIp(req);
  if (!(await enforceRateLimit(`nexus:rl:forgot:${ip}`, 5, 3600))) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.json({ ok: true, message: GENERIC_SENT });
    return;
  }
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.json({ ok: true, message: GENERIC_SENT });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const token = await issueAuthToken(user.id, "RESET", config.resetTtlMs);
    const mail = resetEmailBody(`${publicOrigin()}/reset?token=${token}`);
    await sendMail(email, mail.subject, mail.text);
  }
  await withMinDelay(started, config.authMinDelayMs, null);
  res.json({ ok: true, message: GENERIC_SENT });
}

export async function resetPassword(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }
  const row = await consumeAuthToken(parsed.data.token, "RESET");
  if (!row) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash } });
  await bumpTokenVersion(row.userId);
  await withMinDelay(started, config.authMinDelayMs, null);
  res.json({ ok: true });
}

export async function requestDeletion(req: AuthedRequest, res: Response): Promise<void> {
  const started = Date.now();
  const ip = clientIp(req);
  if (!(await enforceRateLimit(`nexus:rl:delete:${ip}`, 5, 3600))) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.json({ ok: true, message: "If that email is on file, we logged the request." });
    return;
  }
  const parsed = deletionSchema.safeParse(req.body);
  if (!parsed.success) {
    await withMinDelay(started, config.authMinDelayMs, null);
    res.status(400).json({ error: "Enter a valid email." });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  await prisma.dataDeletionRequest.create({
    data: {
      email,
      reason: parsed.data.reason ?? "",
      userId: user?.id ?? null,
    },
  });
  await withMinDelay(started, config.authMinDelayMs, null);
  res.json({ ok: true, message: "If that email is on file, we logged the request." });
}

export function createAccountController(io: Server) {
  async function kick(userId: string) {
    const sockets = await dropUserPresence(userId);
    for (const socketId of sockets) {
      const sock = io.sockets.sockets.get(socketId);
      sock?.disconnect(true);
    }
    io.to("world").emit("ACCOUNT_GONE", { userId });
  }

  async function deactivateSelf(req: AuthedRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role === "ADMIN") {
      res.status(403).json({ error: "Admin accounts cannot be deactivated this way" });
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: "DEACTIVATED" } });
    await bumpTokenVersion(user.id);
    await kick(user.id);
    clearAuthCookie(res);
    res.json({ ok: true, status: "DEACTIVATED" });
  }

  async function deleteSelf(req: AuthedRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role === "ADMIN") {
      res.status(403).json({ error: "Admin accounts cannot be deleted this way" });
      return;
    }
    await bumpTokenVersion(user.id);
    await prisma.$transaction((tx) => purgeUser(user.id, tx));
    await dropSessionCache(user.id);
    await kick(user.id);
    clearAuthCookie(res);
    res.json({ ok: true, deleted: true });
  }

  async function markIntroSeen(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    await prisma.user.updateMany({
      where: { id: req.auth.userId, introSeenAt: null },
      data: { introSeenAt: new Date() },
    });
    res.json({ ok: true });
  }

  return { deactivateSelf, deleteSelf, markIntroSeen };
}
