import type { Response } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { prisma } from "../lib/prisma";
import { publicUser } from "../lib/serializers";
import type { AuthedRequest } from "../middleware/auth";

function pair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export function createFriendController(io: Server) {
  async function list(req: AuthedRequest, res: Response): Promise<void> {
    const me = req.auth!.userId;
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ fromId: me }, { toId: me }] },
      include: {
        from: { include: { activeTitle: true, partner: { select: { username: true, gender: true } } } },
        to: { include: { activeTitle: true, partner: { select: { username: true, gender: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const viewer = { id: me, role: req.auth!.role, position: undefined as string | undefined };
    const meUser = await prisma.user.findUnique({ where: { id: me } });
    viewer.position = meUser?.position;
    res.json({
      incoming: rows
        .filter((r) => r.toId === me && r.status === "PENDING")
        .map((r) => ({ id: r.id, status: r.status, createdAt: r.createdAt.toISOString(), user: publicUser(r.from, viewer) })),
      outgoing: rows
        .filter((r) => r.fromId === me && r.status === "PENDING")
        .map((r) => ({ id: r.id, status: r.status, createdAt: r.createdAt.toISOString(), user: publicUser(r.to, viewer) })),
      friends: rows
        .filter((r) => r.status === "ACCEPTED")
        .map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          user: publicUser(r.fromId === me ? r.to : r.from, viewer),
        })),
    });
  }

  async function send(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ username: z.string().min(3).max(32) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Provide a system username" });
      return;
    }
    const me = req.auth!.userId;
    const target = await prisma.user.findUnique({
      where: { username: parsed.data.username.trim() },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    if (!target || target.status !== "ACTIVE") {
      res.status(404).json({ error: "Username not found" });
      return;
    }
    if (target.id === me) {
      res.status(400).json({ error: "Cannot friend yourself" });
      return;
    }
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromId: me, toId: target.id },
          { fromId: target.id, toId: me },
        ],
      },
    });
    if (existing?.status === "ACCEPTED") {
      res.status(409).json({ error: "Already friends" });
      return;
    }
    if (existing?.status === "PENDING") {
      res.status(409).json({ error: "Request already pending" });
      return;
    }
    if (existing?.status === "DECLINED") {
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { fromId: me, toId: target.id, status: "PENDING", respondedAt: null },
      });
      io.to(`user:${target.id}`).emit("FRIEND_REQUEST", { fromUsername: req.auth!.username, id: updated.id });
      res.status(201).json({ request: { id: updated.id, status: updated.status } });
      return;
    }
    const created = await prisma.friendship.create({
      data: { fromId: me, toId: target.id, status: "PENDING" },
    });
    io.to(`user:${target.id}`).emit("FRIEND_REQUEST", { fromUsername: req.auth!.username, id: created.id });
    res.status(201).json({ request: { id: created.id, status: created.status } });
  }

  async function respond(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ requestId: z.string().uuid(), action: z.enum(["ACCEPT", "DECLINE"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid friend response" });
      return;
    }
    const row = await prisma.friendship.findUnique({ where: { id: parsed.data.requestId } });
    if (!row || row.toId !== req.auth!.userId) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (row.status !== "PENDING") {
      res.status(400).json({ error: "Request already resolved" });
      return;
    }
    const updated = await prisma.friendship.update({
      where: { id: row.id },
      data: { status: parsed.data.action === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
    });
    io.to(`user:${row.fromId}`).emit("FRIEND_UPDATE", { id: updated.id, status: updated.status });
    io.to(`user:${row.toId}`).emit("FRIEND_UPDATE", { id: updated.id, status: updated.status });
    res.json({ request: { id: updated.id, status: updated.status } });
  }

  return { list, send, respond, pair };
}
