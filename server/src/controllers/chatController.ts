import type { Response } from "express";
import { prisma } from "../lib/prisma";
import { chatPayload } from "../lib/serializers";
import type { AuthedRequest } from "../middleware/auth";
import { config } from "../config";
import { canSeePosition } from "../lib/positions";
import { messageCutoff } from "../lib/messages";

async function viewerOf(req: AuthedRequest) {
  if (!req.auth) return null;
  return prisma.user.findUnique({ where: { id: req.auth.userId }, select: { id: true, role: true, position: true } });
}

export async function worldHistory(req: AuthedRequest, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit ?? config.worldHistoryLimit), 300);
  const viewer = await viewerOf(req);
  const rows = await prisma.chatMessage.findMany({
    where: { channelType: "WORLD", createdAt: { gte: messageCutoff() } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { sender: { include: { activeTitle: true } } },
  });
  res.json({ messages: rows.reverse().map((m) => chatPayload(m, m.sender, viewer)) });
}

export async function dmHistory(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const peerId = String(req.params.userId);
  const limit = Math.min(Number(req.query.limit ?? config.dmHistoryLimit), 400);
  const viewer = await viewerOf(req);
  const rows = await prisma.chatMessage.findMany({
    where: {
      channelType: "DM",
      createdAt: { gte: messageCutoff() },
      OR: [
        { senderId: req.auth.userId, recipientId: peerId },
        { senderId: peerId, recipientId: req.auth.userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { sender: { include: { activeTitle: true } } },
  });
  res.json({ messages: rows.reverse().map((m) => chatPayload(m, m.sender, viewer)) });
}

export async function conversations(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const me = req.auth.userId;
  const viewer = await viewerOf(req);
  const recent = await prisma.chatMessage.findMany({
    where: {
      channelType: "DM",
      createdAt: { gte: messageCutoff() },
      OR: [{ senderId: me }, { recipientId: me }],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      sender: { include: { activeTitle: true } },
      recipient: { include: { activeTitle: true } },
    },
  });
  const seen = new Set<string>();
  const threads = [];
  for (const m of recent) {
    const peerId = m.senderId === me ? m.recipientId : m.senderId;
    if (!peerId || seen.has(peerId)) continue;
    seen.add(peerId);
    const peer = m.senderId === me ? m.recipient : m.sender;
    if (!peer) continue;
    const visible = canSeePosition(viewer?.position ?? "PLAYER", peer.position, {
      admin: viewer?.role === "ADMIN",
      self: false,
    });
    threads.push({
      peerId: peer.id,
      username: peer.username,
      title: peer.activeTitle?.name ?? "",
      position: visible ? peer.position : "CLASSIFIED",
      lastMessage: m.content,
      lastAt: m.createdAt.toISOString(),
    });
  }
  res.json({ conversations: threads });
}
