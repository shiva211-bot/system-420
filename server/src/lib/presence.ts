import { redis } from "./redis";
import type { CurrencyType } from "./currency";

const ONLINE_KEY = "nexus:online";
const SOCKET_USER_PREFIX = "nexus:socket:";
const USER_SOCKETS_PREFIX = "nexus:user-sockets:";

export type WalletMap = Record<CurrencyType, number>;

export interface PresenceUser {
  userId: string;
  username: string;
  position: string;
  positionLabel: string;
  title: string;
  badge: string;
  wallet: WalletMap;
}

export async function addPresence(socketId: string, user: PresenceUser): Promise<void> {
  const payload = JSON.stringify(user);
  await redis.multi()
    .hset(ONLINE_KEY, user.userId, payload)
    .set(`${SOCKET_USER_PREFIX}${socketId}`, user.userId)
    .sadd(`${USER_SOCKETS_PREFIX}${user.userId}`, socketId)
    .exec();
}

export async function refreshPresence(user: PresenceUser): Promise<void> {
  await redis.hset(ONLINE_KEY, user.userId, JSON.stringify(user));
}

export async function removePresence(socketId: string): Promise<string | null> {
  const userId = await redis.get(`${SOCKET_USER_PREFIX}${socketId}`);
  if (!userId) return null;
  await redis.del(`${SOCKET_USER_PREFIX}${socketId}`);
  await redis.srem(`${USER_SOCKETS_PREFIX}${userId}`, socketId);
  const remaining = await redis.scard(`${USER_SOCKETS_PREFIX}${userId}`);
  if (remaining === 0) {
    await redis.hdel(ONLINE_KEY, userId);
  }
  return userId;
}

export async function listOnline(): Promise<PresenceUser[]> {
  const all = await redis.hvals(ONLINE_KEY);
  return all.map((raw) => JSON.parse(raw) as PresenceUser);
}

export async function getUserSocketIds(userId: string): Promise<string[]> {
  return redis.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
}
