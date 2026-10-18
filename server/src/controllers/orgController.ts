import type { Response } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { ORG_RULES, isOrgType, meetsLeaderRank, positionLabel, type OrgType } from "../lib/positions";

async function orgSnapshot(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, username: true, position: true } },
      members: { include: { user: { select: { id: true, username: true, position: true } } } },
      children: { select: { id: true, name: true, type: true } },
      parent: { select: { id: true, name: true, type: true } },
    },
  });
  if (!org) return null;
  return {
    id: org.id,
    type: org.type,
    name: org.name,
    leader: { id: org.leader.id, username: org.leader.username, positionLabel: positionLabel(org.leader.position) },
    parent: org.parent,
    children: org.children,
    members: org.members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      positionLabel: positionLabel(m.user.position),
      role: m.role,
    })),
    memberCount: org.members.length,
    rules: isOrgType(org.type) ? ORG_RULES[org.type] : null,
  };
}

export function createOrgController(_io: Server) {
  async function mine(req: AuthedRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { orgMemberships: { include: { org: { include: { leader: { select: { username: true, position: true } } } } } } },
    });
    const openParties = await prisma.organization.findMany({
      where: { type: "PARTY" },
      include: { members: true, leader: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      memberships: (user?.orgMemberships ?? []).map((m) => ({
        orgId: m.orgId,
        role: m.role,
        type: m.org.type,
        name: m.org.name,
        leader: m.org.leader.username,
      })),
      partyId: user?.partyId ?? null,
      openParties: openParties.map((p) => ({
        id: p.id,
        name: p.name,
        leader: p.leader.username,
        memberCount: p.members.length,
        maxMembers: ORG_RULES.PARTY.maxMembers,
      })),
      rules: ORG_RULES,
    });
  }

  async function create(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z
      .object({
        type: z.string(),
        name: z.string().min(3).max(40),
        parentId: z.string().uuid().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success || !isOrgType(parsed.data.type)) {
      res.status(400).json({ error: "Invalid organization payload" });
      return;
    }
    const type = parsed.data.type as OrgType;
    const rules = ORG_RULES[type];
    const me = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!me) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    if (!meetsLeaderRank(me.position, rules.minLeader) && me.role !== "ADMIN") {
      res.status(403).json({ error: `Need ${positionLabel(rules.minLeader)} or higher to lead a ${rules.label}` });
      return;
    }
    if (type === "PARTY" && me.partyId) {
      res.status(400).json({ error: "Leave your current party first" });
      return;
    }
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          type,
          name: parsed.data.name.trim(),
          leaderId: me.id,
          parentId: parsed.data.parentId ?? null,
        },
      });
      await tx.orgMember.create({ data: { orgId: created.id, userId: me.id, role: "LEADER" } });
      if (type === "PARTY") {
        await tx.user.update({ where: { id: me.id }, data: { partyId: created.id } });
      }
      return created;
    });
    res.status(201).json({ org: await orgSnapshot(org.id) });
  }

  async function joinParty(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ orgId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid party" });
      return;
    }
    try {
      await prisma.$transaction(async (tx) => {
        const me = await tx.user.findUnique({ where: { id: req.auth!.userId } });
        if (!me) throw new Error("User not found");
        if (me.partyId) throw new Error("Leave your current party first");
        const org = await tx.organization.findUnique({
          where: { id: parsed.data.orgId },
          include: { members: true },
        });
        if (!org || org.type !== "PARTY") throw new Error("Party not found");
        if (org.members.length >= ORG_RULES.PARTY.maxMembers) throw new Error("Party is full (max 5)");
        await tx.orgMember.create({ data: { orgId: org.id, userId: me.id, role: "MEMBER" } });
        await tx.user.update({ where: { id: me.id }, data: { partyId: org.id } });
      });
      res.json({ org: await orgSnapshot(parsed.data.orgId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Join failed" });
    }
  }

  async function leaveParty(req: AuthedRequest, res: Response): Promise<void> {
    const me = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!me?.partyId) {
      res.status(400).json({ error: "Not in a party" });
      return;
    }
    const org = await prisma.organization.findUnique({ where: { id: me.partyId }, include: { members: true } });
    if (org && org.leaderId === me.id) {
      res.status(400).json({ error: "Party leader cannot leave. Transfer or dissolve first." });
      return;
    }
    await prisma.$transaction([
      prisma.orgMember.delete({ where: { orgId_userId: { orgId: me.partyId, userId: me.id } } }),
      prisma.user.update({ where: { id: me.id }, data: { partyId: null } }),
    ]);
    res.json({ ok: true });
  }

  async function attach(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ parentId: z.string().uuid(), childId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid attach payload" });
      return;
    }
    try {
      const parent = await prisma.organization.findUnique({
        where: { id: parsed.data.parentId },
        include: { children: true, leader: true },
      });
      const child = await prisma.organization.findUnique({
        where: { id: parsed.data.childId },
        include: { members: true },
      });
      if (!parent || !child) throw new Error("Organization not found");
      if (parent.leaderId !== req.auth!.userId && req.auth!.role !== "ADMIN") throw new Error("Only the leader can attach units");
      if (!isOrgType(parent.type) || !isOrgType(child.type)) throw new Error("Unknown org type");
      const rules = ORG_RULES[parent.type];
      if (!rules.childTypes.includes(child.type)) throw new Error(`${ORG_RULES[child.type].label} cannot join this ${rules.label}`);
      if (parent.children.length >= rules.maxChildren) throw new Error(`${rules.label} is at capacity`);
      if (child.parentId) throw new Error("Child already attached");
      if (parent.type === "CLAN") {
        const headcount = child.members.length;
        if (headcount < ORG_RULES.PARTY.minMembers) throw new Error("Party is too small to join a clan");
      }
      await prisma.organization.update({ where: { id: child.id }, data: { parentId: parent.id } });
      res.json({ parent: await orgSnapshot(parent.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Attach failed" });
    }
  }

  async function detail(req: AuthedRequest, res: Response): Promise<void> {
    const org = await orgSnapshot(String(req.params.id));
    if (!org) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ org });
  }

  return { mine, create, joinParty, leaveParty, attach, detail };
}
