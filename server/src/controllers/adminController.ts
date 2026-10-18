import type { Response } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { prisma } from "../lib/prisma";
import { publicUser } from "../lib/serializers";
import type { AuthedRequest } from "../middleware/auth";
import { POSITIONS, grantsBetween, grantToIncrement, isPosition, positionLabel, type Position } from "../lib/positions";
import { CURRENCY_TYPES, currencyColumn, currencyLabel, isCurrencyType } from "../lib/currency";
import { toPresence } from "./economyController";
import { refreshPresence } from "../lib/presence";
import { dropUserPresence, purgeUser } from "../lib/accounts";
import { bumpTokenVersion, dropSessionCache } from "../lib/session";

function badgeFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "title";
}

export function createAdminController(io: Server) {
  async function emitWallet(userId: string, payload: ReturnType<typeof publicUser>) {
    await refreshPresence(toPresence(payload));
    io.to(`user:${userId}`).emit("WALLET_UPDATE", payload);
    io.to("world").emit("PRESENCE_UPDATE", toPresence(payload));
    io.to(`user:${userId}`).emit("POSITION_UPDATE", payload);
  }

  async function listUsers(req: AuthedRequest, res: Response): Promise<void> {
    const q = String(req.query.q ?? "").trim();
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const viewer = { id: req.auth!.userId, role: "ADMIN", position: "SYSTEM_OPERATOR" };
    res.json({ users: users.map((u) => publicUser(u, viewer)), positions: POSITIONS.map((p) => ({ id: p, label: positionLabel(p) })) });
  }

  async function setPosition(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        position: z.string(),
      })
      .safeParse(req.body);
    if (!parsed.success || !isPosition(parsed.data.position)) {
      res.status(400).json({ error: "Invalid position payload" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
        if (!target) throw new Error("User not found");
        if (target.role === "ADMIN" && target.position === "SYSTEM_OPERATOR" && parsed.data.position !== "SYSTEM_OPERATOR") {
          throw new Error("Cannot demote the system operator this way");
        }
        const from = isPosition(target.position) ? target.position : "PLAYER";
        const to = parsed.data.position as Position;
        const grant = grantsBetween(from, to);
        const increment = grantToIncrement(grant);
        const updated = await tx.user.update({
          where: { id: target.id },
          data: {
            position: to,
            ...increment,
          },
          include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
        });
        if (Object.keys(grant).length > 0) {
          await tx.transaction.create({
            data: {
              senderId: req.auth!.userId,
              receiverId: target.id,
              amount: Object.values(grant).reduce((a, b) => a + (b ?? 0), 0),
              currency: "BRONZE",
              type: `POSITION_GRANT:${from}->${to}`,
            },
          });
        }
        return { updated, grant };
      });
      const payload = publicUser(result.updated);
      await emitWallet(result.updated.id, payload);
      res.json({ user: payload, grant: result.grant });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Upgrade failed" });
    }
  }

  async function grantCurrency(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        currency: z.enum(CURRENCY_TYPES),
        amount: z.number().int().positive().max(1_000_000_000),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid grant payload" });
      return;
    }
    if (!isCurrencyType(parsed.data.currency)) {
      res.status(400).json({ error: "Unknown currency" });
      return;
    }
    const column = currencyColumn(parsed.data.currency);
    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { [column]: { increment: parsed.data.amount } },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    await prisma.transaction.create({
      data: {
        senderId: req.auth!.userId,
        receiverId: updated.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        type: "ADMIN_GRANT",
      },
    });
    const payload = publicUser(updated);
    await emitWallet(updated.id, payload);
    res.json({ user: payload, granted: { currency: parsed.data.currency, amount: parsed.data.amount, label: currencyLabel(parsed.data.currency) } });
  }

  async function listDeeds(_req: AuthedRequest, res: Response): Promise<void> {
    const deeds = await prisma.titleDeed.findMany({
      include: { user: true, title: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
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
        user: { id: d.user.id, username: d.user.username, email: d.user.email, position: d.user.position },
      })),
    });
  }

  async function createAndGrantTitle(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        name: z.string().min(2).max(48),
        description: z.string().min(4).max(280),
        deedId: z.string().uuid().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid title payload" });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
        if (!target) throw new Error("User not found");
        let title = await tx.title.findUnique({ where: { name: parsed.data.name } });
        if (!title) {
          title = await tx.title.create({
            data: {
              name: parsed.data.name,
              description: parsed.data.description,
              badgeId: `${badgeFromName(parsed.data.name)}-${Date.now().toString(36).slice(-4)}`,
              createdById: req.auth!.userId,
            },
          });
        }
        await tx.userTitle.upsert({
          where: { userId_titleId: { userId: target.id, titleId: title.id } },
          update: {},
          create: { userId: target.id, titleId: title.id, grantedBy: req.auth!.userId },
        });
        if (!target.activeTitleId) {
          await tx.user.update({
            where: { id: target.id },
            data: { activeTitleId: title.id, equippedBadge: title.badgeId },
          });
        }
        if (parsed.data.deedId) {
          await tx.titleDeed.update({
            where: { id: parsed.data.deedId },
            data: {
              status: "GRANTED",
              titleId: title.id,
              reviewedById: req.auth!.userId,
              reviewedAt: new Date(),
              adminNote: `Granted title ${title.name}`,
            },
          });
        }
        return tx.user.findUniqueOrThrow({
          where: { id: target.id },
          include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
        });
      });
      const payload = publicUser(result);
      await emitWallet(result.id, payload);
      io.to(`user:${result.id}`).emit("TITLE_GRANTED", { title: payload.activeTitle, user: payload });
      res.json({ user: payload });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Grant failed" });
    }
  }

  async function reviewDeed(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        deedId: z.string().uuid(),
        action: z.enum(["REJECT", "GRANT"]),
        adminNote: z.string().max(280).optional(),
        titleName: z.string().min(2).max(48).optional(),
        titleDescription: z.string().min(4).max(280).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review payload" });
      return;
    }
    const deed = await prisma.titleDeed.findUnique({ where: { id: parsed.data.deedId } });
    if (!deed) {
      res.status(404).json({ error: "Deed not found" });
      return;
    }
    if (parsed.data.action === "REJECT") {
      const updated = await prisma.titleDeed.update({
        where: { id: deed.id },
        data: {
          status: "REJECTED",
          adminNote: parsed.data.adminNote ?? "Rejected",
          reviewedById: req.auth!.userId,
          reviewedAt: new Date(),
        },
      });
      res.json({ deed: { id: updated.id, status: updated.status } });
      return;
    }
    if (!parsed.data.titleName || !parsed.data.titleDescription) {
      res.status(400).json({ error: "Title name and description required to grant" });
      return;
    }
    req.body = {
      userId: deed.userId,
      name: parsed.data.titleName,
      description: parsed.data.titleDescription,
      deedId: deed.id,
    };
    await createAndGrantTitle(req, res);
  }

  async function locationTree(_req: AuthedRequest, res: Response): Promise<void> {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
      orderBy: [{ country: "asc" }, { state: "asc" }, { region: "asc" }, { area: "asc" }, { username: "asc" }],
    });
    const viewer = { id: reqAuthId(_req), role: "ADMIN", position: "SYSTEM_OPERATOR" };
    type Node = { id: string; label: string; count: number; children: Record<string, Node>; users: ReturnType<typeof publicUser>[] };
    const root: Record<string, Node> = {};
    for (const u of users) {
      const pub = publicUser(u, viewer);
      const country = root[u.country] ?? (root[u.country] = { id: u.country, label: pub.countryLabel, count: 0, children: {}, users: [] });
      country.count += 1;
      const state = country.children[u.state] ?? (country.children[u.state] = { id: u.state, label: pub.stateLabel, count: 0, children: {}, users: [] });
      state.count += 1;
      const region = state.children[u.region] ?? (state.children[u.region] = { id: u.region, label: pub.regionLabel, count: 0, children: {}, users: [] });
      region.count += 1;
      const area = region.children[u.area] ?? (region.children[u.area] = { id: u.area, label: pub.areaLabel, count: 0, children: {}, users: [] });
      area.count += 1;
      area.users.push(pub);
    }
    res.json({ tree: Object.values(root).map(serializeNode) });
  }

  async function listUpgradeRequests(_req: AuthedRequest, res: Response): Promise<void> {
    const rows = await prisma.upgradeRequest.findMany({
      include: { user: { include: { activeTitle: true, partner: { select: { username: true, gender: true } } } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    const viewer = { id: reqAuthId(_req), role: "ADMIN", position: "SYSTEM_OPERATOR" };
    res.json({
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
        user: publicUser(r.user, viewer),
      })),
    });
  }

  async function reviewUpgrade(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        requestId: z.string().uuid(),
        action: z.enum(["APPROVE", "REJECT"]),
        adminNote: z.string().max(280).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid upgrade review" });
      return;
    }
    const row = await prisma.upgradeRequest.findUnique({ where: { id: parsed.data.requestId } });
    if (!row || row.status !== "PENDING") {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (parsed.data.action === "REJECT") {
      const updated = await prisma.upgradeRequest.update({
        where: { id: row.id },
        data: {
          status: "REJECTED",
          adminNote: parsed.data.adminNote ?? "Rejected",
          reviewedById: req.auth!.userId,
          reviewedAt: new Date(),
        },
      });
      io.to(`user:${row.userId}`).emit("UPGRADE_UPDATE", { status: updated.status });
      res.json({ request: { id: updated.id, status: updated.status } });
      return;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        const target = await tx.user.findUnique({ where: { id: row.userId } });
        if (!target) throw new Error("User not found");
        const from = isPosition(target.position) ? target.position : "PLAYER";
        const to = isPosition(row.toPosition) ? (row.toPosition as Position) : from;
        const grant = grantsBetween(from, to);
        const increment = grantToIncrement(grant);
        const updatedUser = await tx.user.update({
          where: { id: target.id },
          data: { position: to, ...increment },
          include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
        });
        if (Object.keys(grant).length > 0) {
          await tx.transaction.create({
            data: {
              senderId: req.auth!.userId,
              receiverId: target.id,
              amount: Object.values(grant).reduce((a, b) => a + (b ?? 0), 0),
              currency: "BRONZE",
              type: `POSITION_GRANT:${from}->${to}`,
            },
          });
        }
        await tx.upgradeRequest.update({
          where: { id: row.id },
          data: {
            status: "APPROVED",
            adminNote: parsed.data.adminNote ?? "Approved",
            reviewedById: req.auth!.userId,
            reviewedAt: new Date(),
          },
        });
        return updatedUser;
      });
      const payload = publicUser(result, { id: result.id, role: result.role, position: result.position });
      await emitWallet(result.id, payload);
      res.json({ user: payload });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Approve failed" });
    }
  }

  async function listTaskReports(_req: AuthedRequest, res: Response): Promise<void> {
    const rows = await prisma.taskAssignment.findMany({
      include: { task: true, user: { select: { id: true, username: true, email: true, realName: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    res.json({
      reports: rows.map((r) => ({
        id: r.id,
        status: r.status,
        report: r.report,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
        submittedAt: r.submittedAt?.toISOString() ?? null,
        task: r.task,
        user: r.user,
      })),
    });
  }

  async function reviewTask(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        assignmentId: z.string().uuid(),
        action: z.enum(["APPROVE", "REJECT"]),
        adminNote: z.string().max(280).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid task review" });
      return;
    }
    const row = await prisma.taskAssignment.findUnique({ where: { id: parsed.data.assignmentId } });
    if (!row) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const updated = await prisma.taskAssignment.update({
      where: { id: row.id },
      data: {
        status: parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED",
        adminNote: parsed.data.adminNote ?? "",
        reviewedById: req.auth!.userId,
        reviewedAt: new Date(),
      },
    });
    io.to(`user:${row.userId}`).emit("TASK_UPDATE", { id: updated.id, status: updated.status });
    res.json({ assignment: { id: updated.id, status: updated.status } });
  }

  async function deleteUser(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ userId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    if (parsed.data.userId === req.auth!.userId) {
      res.status(400).json({ error: "Cannot delete your own admin account" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role === "ADMIN") {
      res.status(403).json({ error: "Cannot delete another admin" });
      return;
    }
    await bumpTokenVersion(target.id);
    await prisma.$transaction((tx) => purgeUser(target.id, tx));
    await dropSessionCache(target.id);
    const sockets = await dropUserPresence(target.id);
    for (const socketId of sockets) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
    io.to("world").emit("ACCOUNT_GONE", { userId: target.id });
    res.json({ ok: true, deleted: target.username });
  }

  async function setStatus(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ userId: z.string().uuid(), status: z.enum(["ACTIVE", "DEACTIVATED"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid status payload" });
      return;
    }
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role === "ADMIN") {
      res.status(403).json({ error: "Cannot change admin status" });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status: parsed.data.status },
      include: { activeTitle: true, partner: { select: { username: true, gender: true } } },
    });
    await bumpTokenVersion(updated.id);
    if (parsed.data.status === "DEACTIVATED") {
      const sockets = await dropUserPresence(updated.id);
      for (const socketId of sockets) {
        io.sockets.sockets.get(socketId)?.disconnect(true);
      }
      io.to("world").emit("ACCOUNT_GONE", { userId: updated.id });
    }
    res.json({ user: publicUser(updated, { id: req.auth!.userId, role: "ADMIN", position: "SYSTEM_OPERATOR" }) });
  }

  return {
    listUsers,
    setPosition,
    grantCurrency,
    listDeeds,
    createAndGrantTitle,
    reviewDeed,
    locationTree,
    listUpgradeRequests,
    reviewUpgrade,
    listTaskReports,
    reviewTask,
    deleteUser,
    setStatus,
  };
}

function reqAuthId(req: AuthedRequest): string {
  return req.auth?.userId ?? "";
}

function serializeNode(node: {
  id: string;
  label: string;
  count: number;
  children: Record<string, unknown>;
  users: unknown[];
}): unknown {
  return {
    id: node.id,
    label: node.label,
    count: node.count,
    users: node.users,
    children: Object.values(node.children as Record<string, typeof node>).map(serializeNode),
  };
}
