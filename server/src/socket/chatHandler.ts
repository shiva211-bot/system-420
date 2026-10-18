import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { chatPayload, publicUser } from "../lib/serializers";
import {
  addPresence,
  listOnline,
  refreshPresence,
  removePresence,
} from "../lib/presence";
import { executeTransfer, toPresence } from "../controllers/economyController";
import { redis } from "../lib/redis";
import { CURRENCY_TYPES, currencyLabel, type CurrencyType } from "../lib/currency";

const messageSchema = z.object({
  content: z.string().min(1).max(config.maxMessageLength),
});

const privateSchema = z.object({
  toUserId: z.string().uuid(),
  content: z.string().min(1).max(config.maxMessageLength),
});

const coinsSchema = z.object({
  toUserId: z.string().uuid().optional(),
  toUsername: z.string().min(3).max(24).optional(),
  amount: z.number().int().positive().max(1_000_000_000),
  currency: z.enum(CURRENCY_TYPES).default("BRONZE"),
});

function rateKey(userId: string, action: string) {
  return `nexus:rl:${action}:${userId}`;
}

async function allow(userId: string, action: string, limit: number, windowSec: number): Promise<boolean> {
  const key = rateKey(userId, action);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n <= limit;
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
  });
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  const auth = socket.data.auth as { userId: string; username: string };

  void (async () => {
    const user = await loadUser(auth.userId);
    if (!user || user.status !== "ACTIVE") {
      socket.emit("ERROR", { error: "User not found" });
      socket.disconnect(true);
      return;
    }
    socket.join("world");
    socket.join(`user:${user.id}`);
    const pub = publicUser(user, { id: user.id, role: user.role, position: user.position });
    await addPresence(socket.id, toPresence(pub));
    socket.emit("SESSION", { user: pub });
    io.to("world").emit("ONLINE_USERS", await listOnline());
    socket.emit("JOINED_WORLD", { ok: true });
  })();

  socket.on("JOIN_WORLD", async () => {
    socket.join("world");
    socket.emit("JOINED_WORLD", { ok: true });
    socket.emit("ONLINE_USERS", await listOnline());
  });

  socket.on("SEND_WORLD_MESSAGE", async (raw, ack?: (v: unknown) => void) => {
    try {
      const parsed = messageSchema.safeParse(raw);
      if (!parsed.success) {
        const err = { error: "Invalid message" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      if (!(await allow(auth.userId, "world", 20, 5))) {
        const err = { error: "Slow down" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      const sender = await loadUser(auth.userId);
      if (!sender) return;
      const message = await prisma.chatMessage.create({
        data: {
          channelType: "WORLD",
          senderId: sender.id,
          content: parsed.data.content,
        },
      });
      const payload = chatPayload(message, sender);
      io.to("world").emit("WORLD_MESSAGE", payload);
      ack?.({ ok: true, message: payload });
    } catch (err) {
      const error = { error: err instanceof Error ? err.message : "Send failed" };
      ack?.(error);
      socket.emit("ERROR", error);
    }
  });

  socket.on("SEND_PRIVATE_MESSAGE", async (raw, ack?: (v: unknown) => void) => {
    try {
      const parsed = privateSchema.safeParse(raw);
      if (!parsed.success) {
        const err = { error: "Invalid private message" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      if (!(await allow(auth.userId, "dm", 30, 5))) {
        const err = { error: "Slow down" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      if (parsed.data.toUserId === auth.userId) {
        const err = { error: "Cannot DM yourself" };
        ack?.(err);
        return;
      }
      const recipient = await loadUser(parsed.data.toUserId);
      if (!recipient) {
        const err = { error: "Recipient not found" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      const sender = await loadUser(auth.userId);
      if (!sender) return;
      const message = await prisma.chatMessage.create({
        data: {
          channelType: "DM",
          senderId: sender.id,
          recipientId: recipient.id,
          content: parsed.data.content,
        },
      });
      const payload = chatPayload(message, sender);
      io.to(`user:${sender.id}`).emit("PRIVATE_MESSAGE", payload);
      io.to(`user:${recipient.id}`).emit("PRIVATE_MESSAGE", payload);
      ack?.({ ok: true, message: payload });
    } catch (err) {
      const error = { error: err instanceof Error ? err.message : "DM failed" };
      ack?.(error);
      socket.emit("ERROR", error);
    }
  });

  socket.on("TRANSFER_COINS", async (raw, ack?: (v: unknown) => void) => {
    try {
      const parsed = coinsSchema.safeParse(raw);
      if (!parsed.success) {
        const err = { error: "Invalid transfer" };
        ack?.(err);
        socket.emit("ERROR", err);
        return;
      }
      if (!(await allow(auth.userId, "coins", 10, 10))) {
        const err = { error: "Slow down" };
        ack?.(err);
        return;
      }
      const result = await executeTransfer(
        auth.userId,
        parsed.data.amount,
        parsed.data.currency,
        parsed.data.toUserId,
        parsed.data.toUsername,
      );
      const senderPub = publicUser(result.sender, { id: result.sender.id, role: result.sender.role, position: result.sender.position });
      const receiverPub = publicUser(result.receiver, { id: result.receiver.id, role: result.receiver.role, position: result.receiver.position });
      await refreshPresence(toPresence(senderPub));
      await refreshPresence(toPresence(receiverPub));
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
      io.to(`user:${result.sender.id}`).emit("WALLET_UPDATE", senderPub);
      io.to(`user:${result.receiver.id}`).emit("WALLET_UPDATE", receiverPub);
      io.to(`user:${result.sender.id}`).emit("COINS_SENT", event);
      io.to(`user:${result.receiver.id}`).emit("COINS_RECEIVED", event);
      io.to("world").emit("PRESENCE_UPDATE", toPresence(senderPub));
      io.to("world").emit("PRESENCE_UPDATE", toPresence(receiverPub));
      ack?.({ ok: true, transaction: event, sender: senderPub, receiver: receiverPub });
    } catch (err) {
      const error = { error: err instanceof Error ? err.message : "Transfer failed" };
      ack?.(error);
      socket.emit("ERROR", error);
    }
  });

  socket.on("TYPING", (raw: { channel?: string; toUserId?: string }) => {
    if (raw?.channel === "WORLD") {
      socket.to("world").emit("TYPING", { userId: auth.userId, username: auth.username, channel: "WORLD" });
      return;
    }
    if (raw?.toUserId) {
      io.to(`user:${raw.toUserId}`).emit("TYPING", {
        userId: auth.userId,
        username: auth.username,
        channel: "DM",
      });
    }
  });

  socket.on("disconnect", async () => {
    await removePresence(socket.id);
    io.to("world").emit("ONLINE_USERS", await listOnline());
  });
}
