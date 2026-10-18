import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";

const DEFAULT_TASKS = [
  { title: "Grid Patrol", description: "Walk your assigned sector and report anomalies on the live channel." },
  { title: "Supply Run", description: "Move bronze between operators without overspend. Log each hop." },
  { title: "Recruit Sweep", description: "Invite a free player into an open party and confirm the roster." },
  { title: "Deed Record", description: "Document one field action for admin title review." },
  { title: "Quarter Watch", description: "Confirm your state marker on the India quarters map." },
];

export async function ensureDefaultTasks(): Promise<void> {
  const count = await prisma.gameTask.count();
  if (count > 0) return;
  await prisma.gameTask.createMany({ data: DEFAULT_TASKS });
}

function serializeAssignment(a: {
  id: string;
  status: string;
  report: string;
  adminNote: string;
  createdAt: Date;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  task: { id: string; title: string; description: string };
  user?: { id: string; username: string };
}) {
  return {
    id: a.id,
    status: a.status,
    report: a.report,
    adminNote: a.adminNote,
    createdAt: a.createdAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    task: a.task,
    user: a.user ?? undefined,
  };
}

export function createTaskController() {
  async function catalog(req: AuthedRequest, res: Response): Promise<void> {
    await ensureDefaultTasks();
    const [tasks, mine] = await Promise.all([
      prisma.gameTask.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.taskAssignment.findMany({
        where: { userId: req.auth!.userId },
        include: { task: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      tasks,
      assignments: mine.map((a) => serializeAssignment(a)),
    });
  }

  async function select(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ taskId: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid task" });
      return;
    }
    const task = await prisma.gameTask.findUnique({ where: { id: parsed.data.taskId } });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const existing = await prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId: task.id, userId: req.auth!.userId } },
    });
    if (existing && existing.status !== "REJECTED") {
      res.status(409).json({ error: "Task already selected" });
      return;
    }
    const row = existing
      ? await prisma.taskAssignment.update({
          where: { id: existing.id },
          data: { status: "SELECTED", report: "", adminNote: "", submittedAt: null, reviewedAt: null },
          include: { task: true },
        })
      : await prisma.taskAssignment.create({
          data: { taskId: task.id, userId: req.auth!.userId, status: "SELECTED" },
          include: { task: true },
        });
    res.status(201).json({ assignment: serializeAssignment(row) });
  }

  async function report(req: AuthedRequest, res: Response): Promise<void> {
    const parsed = z.object({ assignmentId: z.string().uuid(), report: z.string().min(12).max(2000) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Report must be 12-2000 characters" });
      return;
    }
    const row = await prisma.taskAssignment.findUnique({ where: { id: parsed.data.assignmentId } });
    if (!row || row.userId !== req.auth!.userId) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    if (row.status === "APPROVED") {
      res.status(400).json({ error: "Already approved" });
      return;
    }
    const updated = await prisma.taskAssignment.update({
      where: { id: row.id },
      data: { report: parsed.data.report, status: "SUBMITTED", submittedAt: new Date() },
      include: { task: true },
    });
    res.json({ assignment: serializeAssignment(updated) });
  }

  return { catalog, select, report };
}
