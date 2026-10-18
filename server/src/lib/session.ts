import { prisma } from "./prisma";
import { redis } from "./redis";
import type { JwtPayload } from "./jwt";

const TV_PREFIX = "nexus:tv:";
const STATUS_PREFIX = "nexus:st:";

export async function cacheSession(userId: string, tokenVersion: number, status: string): Promise<void> {
  const pipeline = redis.multi();
  pipeline.set(`${TV_PREFIX}${userId}`, String(tokenVersion), "EX", 3600);
  pipeline.set(`${STATUS_PREFIX}${userId}`, status, "EX", 3600);
  await pipeline.exec();
}

export async function bumpTokenVersion(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true, status: true },
  });
  await cacheSession(userId, user.tokenVersion, user.status);
  return user.tokenVersion;
}

export async function dropSessionCache(userId: string): Promise<void> {
  await redis.del(`${TV_PREFIX}${userId}`, `${STATUS_PREFIX}${userId}`);
}

export async function assertSession(payload: JwtPayload): Promise<JwtPayload | null> {
  let tv = await redis.get(`${TV_PREFIX}${payload.userId}`);
  let status = await redis.get(`${STATUS_PREFIX}${payload.userId}`);
  if (tv == null || status == null) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, status: true, role: true, username: true },
    });
    if (!user) return null;
    await cacheSession(payload.userId, user.tokenVersion, user.status);
    tv = String(user.tokenVersion);
    status = user.status;
  }
  if (status !== "ACTIVE") return null;
  if (Number(tv) !== payload.tv) return null;
  return payload;
}
