import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { publicUser } from "../lib/serializers";
import type { AuthedRequest } from "../middleware/auth";
import type { Server } from "socket.io";
import { refreshPresence, type PresenceUser } from "../lib/presence";
import {
  CURRENCY_TYPES,
  currencyColumn,
  currencyLabel,
  isCurrencyType,
  type CurrencyType,
  type WalletColumn,
} from "../lib/currency";
import { positionLabel } from "../lib/positions";
import { QUARTER_MARKERS, STATE_META } from "../lib/geo";

const transferSchema = z.object({
  toUserId: z.string().uuid().optional(),
  toUsername: z.string().min(3).max(24).optional(),
  amount: z.number().int().positive().max(1_000_000_000),
  currency: z.enum(CURRENCY_TYPES).default("BRONZE"),
});

export function toPresence(user: ReturnType<typeof publicUser>): PresenceUser {
  return {
    userId: user.id,
    username: user.username,
    position: user.position,
    positionLabel: user.positionLabel,
    title: user.activeTitle,
    badge: user.equippedBadge,
    wallet: user.wallet,
  };
}

export function createEconomyController(io: Server) {
  async function emitWallet(userId: string, payload: ReturnType<typeof publicUser>) {
    await refreshPresence(toPresence(payload));
    io.to(`user:${userId}`).emit("WALLET_UPDATE", payload);
    io.to("world").emit("PRESENCE_UPDATE", toPresence(payload));
  }

  async function transferCoins(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid transfer payload", details: parsed.error.flatten() });
      return;
    }
    const { amount, toUserId, toUsername, currency } = parsed.data;
    if (!toUserId && !toUsername) {
      res.status(400).json({ error: "Provide toUserId or toUsername" });
      return;
    }
    try {
      const result = await executeTransfer(req.auth.userId, amount, currency, toUserId, toUsername);
      await emitWallet(result.sender.id, publicUser(result.sender, { id: result.sender.id, role: result.sender.role, position: result.sender.position }));
      await emitWallet(result.receiver.id, publicUser(result.receiver, { id: result.receiver.id, role: result.receiver.role, position: result.receiver.position }));
      const event = {
        transactionId: result.transaction.id,
        amount: result.transaction.amount,
        currency: result.transaction.currency,
        currencyLabel: currencyLabel(result.transaction.currency as CurrencyType),
        senderId: result.sender.id,
        senderUsername: result.sender.username,
        receiverId: result.receiver.id,
        receiverUsername: result.receiver.username,
        timestamp: result.transaction.createdAt.toISOString(),
      };
      io.to(`user:${result.sender.id}`).emit("COINS_SENT", event);
      io.to(`user:${result.receiver.id}`).emit("COINS_RECEIVED", event);
      res.json({
        transaction: event,
        sender: publicUser(result.sender, { id: result.sender.id, role: result.sender.role, position: result.sender.position }),
        receiver: publicUser(result.receiver, { id: result.receiver.id, role: result.receiver.role, position: result.receiver.position }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed";
      const status = message.startsWith("Insufficient") ? 400 : message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }

  async function listCurrencies(_req: AuthedRequest, res: Response): Promise<void> {
    res.json({ currencies: CURRENCY_TYPES.map((type) => ({ type, label: currencyLabel(type) })) });
  }

  async function listMyTitles(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const titles = await prisma.userTitle.findMany({
      where: { userId: req.auth.userId },
      include: { title: true },
      orderBy: { unlockedAt: "desc" },
    });
    res.json({
      titles: titles.map((t) => ({
        id: t.title.id,
        name: t.title.name,
        description: t.title.description,
        badgeId: t.title.badgeId,
        unlockedAt: t.unlockedAt.toISOString(),
      })),
    });
  }

  async function equipTitle(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const parsed = z.object({ titleId: z.string().uuid().nullable() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid title payload" });
      return;
    }
    if (!parsed.data.titleId) {
      const user = await prisma.user.update({
        where: { id: req.auth.userId },
        data: { activeTitleId: null, equippedBadge: "none" },
        include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
      });
      const payload = publicUser(user, { id: user.id, role: user.role, position: user.position });
      await emitWallet(user.id, payload);
      res.json({ user: payload });
      return;
    }
    const owned = await prisma.userTitle.findUnique({
      where: { userId_titleId: { userId: req.auth.userId, titleId: parsed.data.titleId } },
      include: { title: true },
    });
    if (!owned) {
      res.status(403).json({ error: "Title not granted" });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.auth.userId },
      data: { activeTitleId: owned.titleId, equippedBadge: owned.title.badgeId },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    const payload = publicUser(user, { id: user.id, role: user.role, position: user.position });
    await emitWallet(user.id, payload);
    res.json({ user: payload });
  }

  async function submitDeed(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const parsed = z.object({ content: z.string().min(20).max(2000) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Describe your deed in 20-2000 characters" });
      return;
    }
    const pending = await prisma.titleDeed.count({
      where: { userId: req.auth.userId, status: "PENDING" },
    });
    if (pending >= 5) {
      res.setHeader("Retry-After", "3600");
      res.status(429).json({ error: "Too many pending deeds" });
      return;
    }
    const deed = await prisma.titleDeed.create({
      data: { userId: req.auth.userId, content: parsed.data.content, status: "PENDING" },
    });
    res.status(201).json({
      deed: {
        id: deed.id,
        content: deed.content,
        status: deed.status,
        createdAt: deed.createdAt.toISOString(),
      },
    });
  }

  async function myDeeds(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const deeds = await prisma.titleDeed.findMany({
      where: { userId: req.auth.userId },
      include: { title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      deeds: deeds.map((d) => ({
        id: d.id,
        content: d.content,
        status: d.status,
        adminNote: d.adminNote,
        titleName: d.title?.name ?? null,
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
      })),
    });
  }

  async function updateProfile(req: AuthedRequest, res: Response): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const parsed = z.object({ bio: z.string().max(280) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid profile payload" });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.auth.userId },
      data: { bio: parsed.data.bio },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    res.json({ user: publicUser(user, { id: user.id, role: user.role, position: user.position }) });
  }

  async function getUser(req: AuthedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const [user, viewer] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
      }),
      prisma.user.findUnique({ where: { id: req.auth!.userId } }),
    ]);
    if (!user || (user.status !== "ACTIVE" && viewer?.role !== "ADMIN")) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      user: publicUser(user, {
        id: viewer?.id,
        role: viewer?.role,
        position: viewer?.position,
      }),
    });
  }

  async function quarters(_req: AuthedRequest, res: Response): Promise<void> {
    const grouped = await prisma.user.groupBy({
      by: ["state"],
      where: { role: "USER", status: "ACTIVE" },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(grouped.map((g) => [g.state, g._count._all]));
    res.json({
      markers: QUARTER_MARKERS.map((m) => ({
        state: m.state,
        label: STATE_META[m.state].label,
        short: STATE_META[m.state].short,
        x: m.x,
        y: m.y,
        count: counts[m.state] ?? 0,
      })),
    });
  }

  return {
    transferCoins,
    listCurrencies,
    listMyTitles,
    equipTitle,
    submitDeed,
    myDeeds,
    updateProfile,
    getUser,
    quarters,
    emitWallet,
  };
}

export async function executeTransfer(
  senderId: string,
  amount: number,
  currency: CurrencyType,
  toUserId?: string,
  toUsername?: string,
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  if (!isCurrencyType(currency)) throw new Error("Unknown currency");
  const column: WalletColumn = currencyColumn(currency);
  const label = currencyLabel(currency);

  return prisma.$transaction(async (tx) => {
    const receiver = await tx.user.findFirst({
      where: toUserId ? { id: toUserId, status: "ACTIVE" } : { username: toUsername, status: "ACTIVE" },
    });
    if (!receiver) throw new Error("Recipient not found");
    if (receiver.id === senderId) throw new Error("Cannot transfer coins to yourself");

    const debit = await tx.user.updateMany({
      where: { id: senderId, [column]: { gte: amount } },
      data: { [column]: { decrement: amount } },
    });
    if (debit.count !== 1) throw new Error(`Insufficient ${label}`);

    await tx.user.update({
      where: { id: receiver.id },
      data: { [column]: { increment: amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        senderId,
        receiverId: receiver.id,
        amount,
        currency,
        type: "TRANSFER",
      },
    });

    const sender = await tx.user.findUniqueOrThrow({
      where: { id: senderId },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    const receiverFresh = await tx.user.findUniqueOrThrow({
      where: { id: receiver.id },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    return { sender, receiver: receiverFresh, transaction };
  });
}

export { positionLabel };
