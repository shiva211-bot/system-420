import type { Server } from "socket.io";
import { config } from "../config";
import { prisma } from "./prisma";

const SWEEP_MS = 15_000;

export function messageCutoff(now = Date.now()): Date {
  return new Date(now - config.messageTtlMs);
}

export async function purgeExpiredMessages() {
  const cutoff = messageCutoff();
  const expired = await prisma.chatMessage.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
    take: 500,
  });
  if (expired.length === 0) return expired;
  await prisma.chatMessage.deleteMany({ where: { id: { in: expired.map((m) => m.id) } } });
  return expired;
}

export function startMessageJanitor(io: Server): NodeJS.Timeout {
  const tick = async () => {
    try {
      const expired = await purgeExpiredMessages();
      if (expired.length > 0) {
        io.emit("MESSAGES_EXPIRED", { messageIds: expired.map((m) => m.id) });
      }
    } catch (err) {
      console.error("[gaiya] message janitor", err);
    }
  };
  void tick();
  return setInterval(tick, SWEEP_MS);
}
