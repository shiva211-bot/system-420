import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { grantsBetween, grantToIncrement, isPosition, nextPosition, positionLabel, type Position } from "../lib/positions";

export function createUpgradeController() {
  async function mine(req: AuthedRequest, res: Response): Promise<void> {
    const me = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    const rows = await prisma.upgradeRequest.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const next = me ? nextPosition(me.position) : null;
    res.json({
      current: me?.position ?? "PLAYER",
      currentLabel: positionLabel(me?.position ?? "PLAYER"),
      next,
      nextLabel: next ? positionLabel(next) : null,
      requests: rows.map((r) => ({
        id: r.id,
        fromPosition: r.fromPosition,
        toPosition: r.toPosition,
        fromLabel: positionLabel(r.fromPosition),
        toLabel: positionLabel(r.toPosition),
        note: r.note,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }

  async function submit(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ note: z.string().max(500).optional() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid upgrade request" });
      return;
    }
    const me = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!me) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const next = nextPosition(me.position);
    if (!next) {
      res.status(400).json({ error: "No further player upgrade available" });
      return;
    }
    const pending = await prisma.upgradeRequest.findFirst({
      where: { userId: me.id, status: "PENDING" },
    });
    if (pending) {
      res.status(409).json({ error: "Upgrade request already pending" });
      return;
    }
    const row = await prisma.upgradeRequest.create({
      data: {
        userId: me.id,
        fromPosition: me.position,
        toPosition: next,
        note: parsed.data.note ?? "",
        status: "PENDING",
      },
    });
    res.status(201).json({
      request: {
        id: row.id,
        fromPosition: row.fromPosition,
        toPosition: row.toPosition,
        fromLabel: positionLabel(row.fromPosition),
        toLabel: positionLabel(row.toPosition),
        status: row.status,
      },
    });
  }

  return { mine, submit };
}

export async function applyUpgradeGrant(userId: string, toPosition: string, adminId: string) {
  if (!isPosition(toPosition)) throw new Error("Invalid position");
  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new Error("User not found");
    const from: Position = isPosition(target.position) ? target.position : "PLAYER";
    const grant = grantsBetween(from, toPosition);
    const increment = grantToIncrement(grant);
    const updated = await tx.user.update({
      where: { id: target.id },
      data: { position: toPosition, ...increment },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    if (Object.keys(grant).length > 0) {
      await tx.transaction.create({
        data: {
          senderId: adminId,
          receiverId: target.id,
          amount: Object.values(grant).reduce((a: number, b) => a + (b ?? 0), 0),
          currency: "BRONZE",
          type: `POSITION_GRANT:${from}->${toPosition}`,
        },
      });
    }
    return { updated, grant };
  });
  return result;
}
