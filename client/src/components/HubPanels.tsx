"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { FriendRow, GameTask, PublicUser, QuarterMarker, TaskAssignment, UpgradeRow } from "@/lib/types";

export function FriendsPanel({
  onNotice,
  onOpenDm,
}: {
  onNotice: (m: string) => void;
  onOpenDm: (user: PublicUser) => void;
}) {
  const [handle, setHandle] = useState("");
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.friends();
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
    setFriends(data.friends);
  }

  useEffect(() => {
    void load().catch((err) => onNotice(err instanceof Error ? err.message : "Friends load failed"));
  }, [onNotice]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.friendRequest(handle.trim());
      setHandle("");
      onNotice("Friend request sent");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function respond(id: string, action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    try {
      await api.friendRespond(id, action);
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Respond failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <form onSubmit={send} className="flex gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="System username"
          className="hud-input flex-1 px-3 py-2"
        />
        <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-4">
          SEND REQUEST
        </button>
      </form>
      <Section title="INCOMING">
        {incoming.length === 0 && <Empty text="No pending requests." />}
        {incoming.map((r) => (
          <Row key={r.id} title={r.user.username} sub={r.user.positionLabel}>
            <button disabled={busy} onClick={() => void respond(r.id, "ACCEPT")} className="hud-btn hud-btn-fill min-h-[32px] rounded-sm px-2 py-1 text-xs">
              ACCEPT
            </button>
            <button disabled={busy} onClick={() => void respond(r.id, "DECLINE")} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs text-rose-300">
              DECLINE
            </button>
          </Row>
        ))}
      </Section>
      <Section title="OUTGOING">{outgoing.length === 0 ? <Empty text="None." /> : outgoing.map((r) => <Row key={r.id} title={r.user.username} sub="PENDING" />)}</Section>
      <Section title="FRIENDS">
        {friends.length === 0 && <Empty text="No friends yet." />}
        {friends.map((r) => (
          <Row
            key={r.id}
            title={r.user.username}
            sub={r.user.positionLabel}
            onTitleClick={() => onOpenDm(r.user)}
            titleHint="Tap the name or Message to open a private chat"
          >
            <button
              disabled={busy}
              onClick={() => onOpenDm(r.user)}
              className="hud-btn hud-btn-fill min-h-[32px] rounded-sm px-2 py-1 text-xs"
            >
              MESSAGE
            </button>
          </Row>
        ))}
      </Section>
    </div>
  );
}

export function TasksPanel({ onNotice }: { onNotice: (m: string) => void }) {
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [report, setReport] = useState("");
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.tasks();
    setTasks(data.tasks);
    setAssignments(data.assignments);
  }

  useEffect(() => {
    void load().catch((err) => onNotice(err instanceof Error ? err.message : "Tasks load failed"));
  }, [onNotice]);

  async function select(taskId: string) {
    setBusy(true);
    try {
      await api.selectTask(taskId);
      onNotice("Task selected");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Select failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    try {
      await api.reportTask(active, report.trim());
      setReport("");
      onNotice("Report sent to admin");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Section title="AVAILABLE TASKS">
        {tasks.map((t) => (
          <Row key={t.id} title={t.title} sub={t.description}>
            <button disabled={busy} onClick={() => void select(t.id)} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs">
              SELECT
            </button>
          </Row>
        ))}
      </Section>
      <Section title="YOUR ASSIGNMENTS">
        {assignments.length === 0 && <Empty text="Select a task to begin." />}
        {assignments.map((a) => (
          <Row key={a.id} title={`${a.task.title} · ${a.status}`} sub={a.report || a.task.description}>
            {a.status !== "APPROVED" && (
              <button onClick={() => setActive(a.id)} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs text-gold">
                REPORT
              </button>
            )}
          </Row>
        ))}
      </Section>
      {active && (
        <form onSubmit={submit} className="hud-panel p-4">
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="Task completion information for admin..."
            className="hud-area h-28 p-2"
          />
          <button disabled={busy} className="hud-btn hud-btn-fill mt-2 min-h-[44px] w-full rounded-sm py-2">
            SEND TO ADMIN
          </button>
        </form>
      )}
    </div>
  );
}

export function QuartersPanel({ onNotice }: { onNotice: (m: string) => void }) {
  const [markers, setMarkers] = useState<QuarterMarker[]>([]);
  useEffect(() => {
    void api
      .quarters()
      .then((d) => setMarkers(d.markers))
      .catch((err) => onNotice(err instanceof Error ? err.message : "Map load failed"));
  }, [onNotice]);

  return (
    <div className="p-6">
      <h2 className="glitch mb-4 font-display text-xl text-cyan" data-text="QUARTERS // INDIA GRID">QUARTERS // INDIA GRID</h2>
      <div className="hologram relative w-full max-w-xl overflow-hidden rounded-sm border border-cyan/40 bg-[#030712] shadow-neon">
        <img src="/india-quarters.png" alt="India quarters grid" className="block h-auto w-full" />
        {markers.map((m) => (
          <div
            key={m.state}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-red-500/40" />
            <span className="relative block h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_14px_#ff2a2a]" />
            <span className="absolute left-4 top-[-2px] whitespace-nowrap font-display text-[10px] tracking-widest text-red-200">
              {m.short} ({m.count})
            </span>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-1 text-sm text-white/70">
        {markers.map((m) => (
          <li key={m.state}>
            {m.label}: {m.count} operators
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CorpsPanel({ onNotice }: { onNotice: (m: string) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PARTY");
  const [data, setData] = useState<Awaited<ReturnType<typeof api.orgs>> | null>(null);
  const [upgrade, setUpgrade] = useState<{ nextLabel: string | null; requests: UpgradeRow[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [o, u] = await Promise.all([api.orgs(), api.upgrades()]);
    setData(o);
    setUpgrade({ nextLabel: u.nextLabel, requests: u.requests });
  }

  useEffect(() => {
    void load().catch((err) => onNotice(err instanceof Error ? err.message : "Corps load failed"));
  }, [onNotice]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createOrg({ type, name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <p className="text-sm text-white/70">
        Players are free. Join any open party (4-5). Two or three parties form a clan (8-20). Three clans form a group (40-60). Commanders rule 5 groups, rulers rule 3 commanders, then supreme commander, supreme ruler, diviner, celestial, god, system operator.
      </p>
      {upgrade?.nextLabel && (
        <button
          disabled={busy}
          onClick={() =>
            void api
              .requestUpgrade()
              .then(() => {
                onNotice("Upgrade request sent to admin");
                return load();
              })
              .catch((err) => onNotice(err instanceof Error ? err.message : "Upgrade failed"))
          }
          className="hud-btn min-h-[44px] rounded-sm px-3 py-2 text-sm text-gold"
        >
          Request upgrade to {upgrade.nextLabel}
        </button>
      )}
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="hud-select px-2 py-2">
          {["PARTY", "CLAN", "GROUP", "COMMAND", "RULE"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Unit name" className="hud-input flex-1 px-3 py-2" />
        <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-3">
          FOUND
        </button>
      </form>
      <Section title="OPEN PARTIES">
        {(data?.openParties ?? []).map((p) => (
          <Row key={p.id} title={p.name} sub={`${p.leader} · ${p.memberCount}/${p.maxMembers}`}>
            <button disabled={busy} onClick={() => void api.joinParty(p.id).then(load).catch((err) => onNotice(err instanceof Error ? err.message : "Join failed"))} className="hud-btn min-h-[32px] rounded-sm px-2 py-1 text-xs">
              JOIN
            </button>
          </Row>
        ))}
      </Section>
      <Section title="YOUR UNITS">
        {(data?.memberships ?? []).length === 0 && <Empty text="No unit yet." />}
        {(data?.memberships ?? []).map((m) => (
          <Row key={m.orgId} title={m.name} sub={`${m.type} · ${m.role} · lead ${m.leader}`} />
        ))}
        {data?.partyId && (
          <button disabled={busy} onClick={() => void api.leaveParty().then(load).catch((err) => onNotice(err instanceof Error ? err.message : "Leave failed"))} className="hud-btn min-h-[36px] rounded-sm px-3 text-xs text-rose-300">
            Leave party
          </button>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-xs tracking-widest text-gold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  title,
  sub,
  children,
  onTitleClick,
  titleHint,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
  onTitleClick?: () => void;
  titleHint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-sm border border-cyan/20 bg-black/30 p-3">
      <div className="min-w-0">
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            title={titleHint}
            className="min-h-[24px] text-left font-display text-sm text-cyan underline-offset-2 hover:text-white hover:underline"
          >
            {title}
          </button>
        ) : (
          <p className="font-display text-sm">{title}</p>
        )}
        {sub && <p className="text-xs text-white/60">{sub}</p>}
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-white/40">{text}</p>;
}
