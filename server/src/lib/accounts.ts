import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { redis } from "./redis";

const ONLINE_KEY = "nexus:online";
const SOCKET_USER_PREFIX = "nexus:socket:";
const USER_SOCKETS_PREFIX = "nexus:user-sockets:";

export async function dropUserPresence(userId: string): Promise<string[]> {
  const sockets = await redis.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
  if (sockets.length > 0) {
    const pipeline = redis.multi();
    for (const socketId of sockets) {
      pipeline.del(`${SOCKET_USER_PREFIX}${socketId}`);
    }
    pipeline.del(`${USER_SOCKETS_PREFIX}${userId}`);
    pipeline.hdel(ONLINE_KEY, userId);
    await pipeline.exec();
  } else {
    await redis.hdel(ONLINE_KEY, userId);
  }
  return sockets;
}

export async function purgeUser(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
  const db = tx ?? prisma;
  await db.user.updateMany({ where: { partnerId: userId }, data: { partnerId: null } });

  const led = await db.organization.findMany({ where: { leaderId: userId }, select: { id: true } });
  for (const org of led) {
    await db.organization.updateMany({ where: { parentId: org.id }, data: { parentId: null } });
    await db.user.updateMany({ where: { partyId: org.id }, data: { partyId: null } });
    await db.orgMember.deleteMany({ where: { orgId: org.id } });
    await db.organization.delete({ where: { id: org.id } });
  }

  await db.orgMember.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
  await db.user.update({
    where: { id: userId },
    data: { partyId: null, partnerId: null, activeTitleId: null },
  });
  await db.user.delete({ where: { id: userId } });
}
