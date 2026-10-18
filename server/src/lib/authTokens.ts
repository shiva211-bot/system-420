import { prisma } from "./prisma";
import { hashToken, randomToken } from "./cryptoTokens";

export async function issueAuthToken(userId: string, type: "VERIFY" | "RESET", ttlMs: number): Promise<string> {
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = randomToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

export async function consumeAuthToken(raw: string, type: "VERIFY" | "RESET") {
  const tokenHash = hashToken(raw);
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  const claimed = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  return row;
}
