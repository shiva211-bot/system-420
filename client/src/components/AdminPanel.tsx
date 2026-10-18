"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { api } from "@/lib/api";
import { CURRENCY_TYPES, currencyLabel } from "@/lib/currency";
import { disconnectSocket } from "@/lib/socket";
import { useNexus } from "@/lib/store";
import type { Deed, LocationNode, PublicUser, TaskAssignment, UpgradeRow } from "@/lib/types";
import { HudFX } from "@/components/HudFX";

export function AdminPanel() {
  const reset = useNexus((s) => s.reset);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [positions, setPositions] = useState<{ id: string; label: string }[]>([]);
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [grant, setGrant] = useState({ userId: "", currency: "BRONZE", amount: "10" });
  const [titleForm, setTitleForm] = useState({ userId: "", name: "", description: "" });
  const [review, setReview] = useState({ deedId: "", titleName: "", titleDescription: "", adminNote: "" });
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeRow[]>([]);
  const [taskReports, setTaskReports] = useState<TaskAssignment[]>([]);

  async function load(query = q) {
    const [u, d, loc, up, tasks] = await Promise.all([
      api.adminUsers(query),
      api.adminDeeds(),
      api.adminLocations(),
      api.adminUpgrades(),
      api.adminTasks(),
    ]);
    setUsers(u.users);
    setPositions(u.positions);
    setDeeds(d.deeds);
    setTree(loc.tree);
    setUpgrades(up.requests);
    setTaskReports(tasks.reports);
  }

  useEffect(() => {
    void load("").catch((err) => setNotice(err instanceof Error ? err.message : "Load failed"));
  }, []);

  async function search(e: FormEvent) {
    e.preventDefault();
    await load(q);
  }

  async function upgrade(userId: string, position: string) {
    setBusy(true);
    try {
      await api.adminSetPosition(userId, position);
      setNotice("Position updated. Grants stacked into wallet.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setBusy(false);
    }
  }

  async function grantCoins(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminGrantCurrency(grant.userId, grant.currency, Number(grant.amount));
      setNotice("Currency granted.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusy(false);
    }
  }

  async function grantTitle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminGrantTitle(titleForm);
      setNotice("Title created and granted.");
      setTitleForm({ userId: "", name: "", description: "" });
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Title grant failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectDeed(deedId: string) {
    setBusy(true);
    try {
      await api.adminReviewDeed({ deedId, action: "REJECT", adminNote: review.adminNote || "Rejected" });
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlayer(userId: string, username: string) {
    if (!window.confirm(`Permanently delete ${username}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.adminDeleteUser(userId);
      setNotice(`Deleted ${username}`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(userId: string, status: string, username: string) {
    const next = status === "DEACTIVATED" ? "ACTIVE" : "DEACTIVATED";
    setBusy(true);
    try {
      await api.adminSetStatus(userId, next);
      setNotice(`${username} is now ${next}`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function grantDeed(deed: Deed) {
    if (!review.titleName || !review.titleDescription) {
      setNotice("Enter title name and description to grant");
      return;
    }
    setBusy(true);
    try {
      await api.adminReviewDeed({
        deedId: deed.id,
        action: "GRANT",
        titleName: review.titleName,
        titleDescription: review.titleDescription,
        adminNote: review.adminNote,
      });
      setReview({ deedId: "", titleName: "", titleDescription: "", adminNote: "" });
      setNotice("Deed granted as title.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent p-6 pb-16 text-white">
      <HudFX />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="hud-live font-display text-[10px] tracking-[0.4em] text-gold">SYSTEM OPERATOR</p>
            <p className="glitch mt-1 font-display text-3xl" data-text="Admin Console">Admin Console</p>
          </div>
          <button
            onClick={() => {
              void api.logout().then(() => {
                disconnectSocket();
                reset();
              });
            }}
            className="hud-btn flex min-h-[44px] items-center gap-2 rounded-sm px-3 py-2 text-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
        {notice && <p className="mb-4 rounded-sm border border-gold/50 bg-black/50 px-3 py-2 text-sm text-gold shadow-gold">{notice}</p>}

        <form onSubmit={search} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-cyan/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search username or email"
              aria-label="Search username or email"
              className="hud-input py-2 pl-9 pr-3"
            />
          </div>
          <button className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-4">Search</button>
        </form>
        <p className="mb-4 text-xs text-white/50">
          <Link href="/privacy" className="text-cyan underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-cyan underline">
            Terms
          </Link>
          {" · "}
          <Link href="/delete-data" className="text-cyan underline">
            Delete data
          </Link>
        </p>

        <section className="hud-panel mb-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 font-display text-[10px] tracking-widest text-cyan">
              <tr>
                <th className="p-3">HANDLE</th>
                <th className="p-3">REAL NAME</th>
                <th className="p-3">EMAIL</th>
                <th className="p-3">POSITION</th>
                <th className="p-3">BRZ</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">UPGRADE</th>
                <th className="p-3">ACCOUNT</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-cyan/10 hover:bg-cyan/5">
                  <td className="p-3">{u.username}</td>
                  <td className="p-3 text-white/70">{u.realName || "-"}</td>
                  <td className="p-3 text-white/60">{u.email}</td>
                  <td className="p-3 text-cyan">{u.positionLabel}</td>
                  <td className="p-3">{u.wallet.BRONZE.toLocaleString()}</td>
                  <td className="p-3 text-xs">{u.status === "DEACTIVATED" ? "DEACTIVATED" : "ACTIVE"}</td>
                  <td className="p-3">
                    <select
                      disabled={busy || u.role === "ADMIN"}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) void upgrade(u.id, e.target.value);
                        e.target.value = "";
                      }}
                       className="hud-select rounded-sm px-2 py-1 text-xs"
                    >
                      <option value="">Set position...</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    {u.role !== "ADMIN" && (
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => void toggleStatus(u.id, u.status ?? "ACTIVE", u.username)}
                          className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-[10px] text-gold"
                        >
                          {u.status === "DEACTIVATED" ? "Reactivate" : "Deactivate"}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void deletePlayer(u.id, u.username)}
                          className="hud-btn min-h-[32px] rounded-sm border-rose-500/60 px-2 py-1 text-[10px] text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <form onSubmit={grantCoins} className="hud-panel p-5">
            <h2 className="mb-3 font-display text-cyan">Grant Currency</h2>
            <select
              value={grant.userId}
              onChange={(e) => setGrant({ ...grant, userId: e.target.value })}
              className="hud-select mb-2 px-2 py-2 text-sm"
            >
              <option value="">Select player</option>
              {users.filter((u) => u.role !== "ADMIN").map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
            <select
              value={grant.currency}
              onChange={(e) => setGrant({ ...grant, currency: e.target.value })}
              className="hud-select mb-2 px-2 py-2 text-sm"
            >
              {CURRENCY_TYPES.map((c) => (
                <option key={c} value={c}>
                  {currencyLabel(c)}
                </option>
              ))}
            </select>
            <input
              value={grant.amount}
              onChange={(e) => setGrant({ ...grant, amount: e.target.value.replace(/[^\d]/g, "") })}
              className="hud-input mb-2 px-2 py-2"
            />
            <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] w-full rounded-sm py-2">
              GRANT
            </button>
          </form>

          <form onSubmit={grantTitle} className="hud-panel p-5">
            <h2 className="mb-3 font-display text-cyan">Create and Grant Title</h2>
            <select
              value={titleForm.userId}
              onChange={(e) => setTitleForm({ ...titleForm, userId: e.target.value })}
              className="hud-select mb-2 px-2 py-2 text-sm"
            >
              <option value="">Select player</option>
              {users.filter((u) => u.role !== "ADMIN").map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
            <input
              value={titleForm.name}
              onChange={(e) => setTitleForm({ ...titleForm, name: e.target.value })}
              placeholder="Title name"
              className="hud-input mb-2 px-2 py-2"
            />
            <input
              value={titleForm.description}
              onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })}
              placeholder="Why this title exists"
              className="hud-input mb-2 px-2 py-2"
            />
            <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] w-full rounded-sm py-2">
              CREATE + GRANT
            </button>
          </form>
        </div>

        <section className="hud-panel p-5">
          <h2 className="mb-3 font-display text-cyan">Deed Queue</h2>
          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <input
              value={review.titleName}
              onChange={(e) => setReview({ ...review, titleName: e.target.value })}
              placeholder="Title name for grant"
              className="hud-input px-2 py-2 text-sm"
            />
            <input
              value={review.titleDescription}
              onChange={(e) => setReview({ ...review, titleDescription: e.target.value })}
              placeholder="Title description"
              className="hud-input px-2 py-2 text-sm"
            />
            <input
              value={review.adminNote}
              onChange={(e) => setReview({ ...review, adminNote: e.target.value })}
              placeholder="Admin note"
              className="hud-input px-2 py-2 text-sm"
            />
          </div>
          <div className="space-y-3">
            {deeds.map((d) => (
              <div key={d.id} className="rounded-sm border border-cyan/20 bg-black/30 p-3">
                <p className="text-sm text-white/80">{d.content}</p>
                <p className="mt-1 text-xs text-cyan">
                  {d.user?.username} · {d.status}
                  {d.titleName ? ` · ${d.titleName}` : ""}
                </p>
                {d.status === "PENDING" && (
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy} onClick={() => void grantDeed(d)} className="hud-btn hud-btn-fill min-h-[32px] rounded-sm px-3 py-1 text-xs">
                      CREATE TITLE + GRANT
                    </button>
                    <button disabled={busy} onClick={() => void rejectDeed(d.id)} className="hud-btn min-h-[32px] rounded-sm px-3 py-1 text-xs text-rose-300">
                      REJECT
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel mt-8 p-5">
          <h2 className="mb-3 font-display text-cyan">Upgrade Requests</h2>
          <div className="space-y-2">
            {upgrades.length === 0 && <p className="text-sm text-white/40">None.</p>}
            {upgrades.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-cyan/20 bg-black/30 p-3">
                <p className="text-sm">
                  {r.user?.username} · {r.fromLabel} to {r.toLabel} · {r.status}
                </p>
                {r.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => void api.adminReviewUpgrade(r.id, "APPROVE").then(() => load())} className="hud-btn hud-btn-fill min-h-[32px] rounded-sm px-2 py-1 text-xs">
                      APPROVE
                    </button>
                    <button disabled={busy} onClick={() => void api.adminReviewUpgrade(r.id, "REJECT").then(() => load())} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs text-rose-300">
                      REJECT
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel mt-8 p-5">
          <h2 className="mb-3 font-display text-cyan">Task Reports</h2>
          <div className="space-y-2">
            {taskReports.length === 0 && <p className="text-sm text-white/40">None.</p>}
            {taskReports.map((r) => (
              <div key={r.id} className="rounded-sm border border-cyan/20 bg-black/30 p-3">
                <p className="text-sm">
                  {r.user?.username} · {r.task.title} · {r.status}
                </p>
                {r.user?.realName && <p className="text-xs text-gold">Real name: {r.user.realName}</p>}
                {r.report && <p className="mt-1 text-xs text-white/70">{r.report}</p>}
                {r.status === "SUBMITTED" && (
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy} onClick={() => void api.adminReviewTask(r.id, "APPROVE").then(() => load())} className="hud-btn hud-btn-fill min-h-[32px] rounded-sm px-2 py-1 text-xs">
                      APPROVE
                    </button>
                    <button disabled={busy} onClick={() => void api.adminReviewTask(r.id, "REJECT").then(() => load())} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs text-rose-300">
                      REJECT
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel mt-8 p-5">
          <h2 className="mb-3 font-display text-cyan">Location Tree</h2>
          <p className="mb-3 text-xs text-white/50">Country / State / Region / Area</p>
          <LocationTree nodes={tree} />
        </section>
      </div>
    </div>
  );
}

function LocationTree({ nodes, depth = 0 }: { nodes: LocationNode[]; depth?: number }) {
  if (!nodes.length) return <p className="text-sm text-white/40">No players yet.</p>;
  return (
    <div className={depth ? "ml-4 border-l border-cyan/20 pl-3" : ""}>
      {nodes.map((n) => (
        <details key={`${n.id}-${depth}`} open={depth < 1} className="mb-2">
          <summary className="cursor-pointer font-display text-sm text-cyan">
            {n.label} ({n.count})
          </summary>
          {n.users.map((u) => (
            <p key={u.id} className="pl-3 text-xs text-white/70">
              {u.username} · {u.realName || "hidden"} · {u.positionLabel}
            </p>
          ))}
          {n.children.length > 0 && <LocationTree nodes={n.children} depth={depth + 1} />}
        </details>
      ))}
    </div>
  );
}
