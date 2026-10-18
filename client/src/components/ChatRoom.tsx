"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Map, MessageSquare, Send, Swords, Users, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { initials } from "@/lib/badges";
import { CURRENCY_TYPES, currencyColor, currencyLabel, currencyShort, type CurrencyType } from "@/lib/currency";
import { connectSocket, disconnectSocket, emitWithAck } from "@/lib/socket";
import { useNexus } from "@/lib/store";
import type { ChatPayload, CoinEvent, PresenceUser, PublicUser } from "@/lib/types";
import { CorpsPanel, FriendsPanel, QuartersPanel, TasksPanel } from "@/components/HubPanels";
import { HudFX } from "@/components/HudFX";

const MAX_CHARS = 2000;

export function ChatRoom() {
  const me = useNexus((s) => s.me)!;
  const token = useNexus((s) => s.token);
  const world = useNexus((s) => s.world);
  const dms = useNexus((s) => s.dms);
  const online = useNexus((s) => s.online);
  const channel = useNexus((s) => s.channel);
  const ownedTitles = useNexus((s) => s.ownedTitles);
  const deeds = useNexus((s) => s.deeds);
  const profile = useNexus((s) => s.profile);
  const notice = useNexus((s) => s.notice);
  const typing = useNexus((s) => s.typing);
  const conversations = useNexus((s) => s.conversations);
  const transfer = useNexus((s) => s.transfer);
  const store = useNexus();
  const [draft, setDraft] = useState("");
  const [amount, setAmount] = useState("10");
  const [deedText, setDeedText] = useState("");
  const [deedOpen, setDeedOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hub, setHub] = useState<"chat" | "friends" | "tasks" | "quarters" | "corps">("chat");
  const scroller = useRef<HTMLDivElement>(null);

  const messages = channel === "WORLD" ? world : dms[channel] ?? [];
  const peer = online.find((u) => u.userId === channel);
  const conv = conversations.find((c) => c.peerId === channel);
  const peerName =
    peer?.username ??
    conv?.username ??
    (profile && profile.id === channel ? profile.username : undefined) ??
    "Operator";

  useEffect(() => {
    const socket = connectSocket(token ?? undefined);
    const s = useNexus.getState();

    socket.on("SESSION", (payload: { user: PublicUser }) => s.patchMe(payload.user));
    socket.on("ONLINE_USERS", (users: PresenceUser[]) => s.setOnline(users));
    socket.on("PRESENCE_UPDATE", (user: PresenceUser) => s.patchPresence(user));
    socket.on("WORLD_MESSAGE", (msg: ChatPayload) => s.pushWorld(msg));
    socket.on("PRIVATE_MESSAGE", (msg: ChatPayload) => s.pushDm(msg, useNexus.getState().me?.id ?? ""));
    socket.on("MESSAGES_EXPIRED", (p: { messageIds: string[] }) => s.dropMessages(p.messageIds));
    socket.on("WALLET_UPDATE", (user: PublicUser) => {
      const current = useNexus.getState().me;
      if (current && current.id === user.id) s.patchMe(user);
      const p = useNexus.getState().profile;
      if (p && p.id === user.id) s.setProfile(user);
    });
    socket.on("POSITION_UPDATE", (user: PublicUser) => {
      const current = useNexus.getState().me;
      if (current && current.id === user.id) {
        s.patchMe(user);
        s.setNotice(`Position updated: ${user.positionLabel}`);
      }
    });
    socket.on("TITLE_GRANTED", (payload: { title: string }) => {
      s.setNotice(`Title granted: ${payload.title}`);
      void api.me().then((d) => {
        s.patchMe(d.user);
        s.setOwned(d.titles);
      });
    });
    socket.on("COINS_RECEIVED", (event: CoinEvent) => s.applyCoinEvent(event, useNexus.getState().me?.id ?? ""));
    socket.on("COINS_SENT", (event: CoinEvent) => s.applyCoinEvent(event, useNexus.getState().me?.id ?? ""));
    socket.on("TYPING", (p: { username: string }) => {
      s.setTyping(p.username);
      setTimeout(() => {
        if (useNexus.getState().typing === p.username) s.setTyping(null);
      }, 1600);
    });
    socket.on("FRIEND_REQUEST", (p: { fromUsername: string }) => s.setNotice(`Friend request from ${p.fromUsername}`));
    socket.on("ACCOUNT_GONE", (p: { userId: string }) => {
      const current = useNexus.getState();
      current.setOnline(current.online.filter((u) => u.userId !== p.userId));
      if (current.channel === p.userId) current.setChannel("WORLD");
    });
    socket.on("FRIEND_UPDATE", () => s.setNotice("Friend list updated"));
    socket.on("UPGRADE_UPDATE", (p: { status: string }) => s.setNotice(`Upgrade ${p.status.toLowerCase()}`));
    socket.on("TASK_UPDATE", (p: { status: string }) => s.setNotice(`Task ${p.status.toLowerCase()}`));
    socket.on("ERROR", (e: { error: string }) => s.setNotice(e.error));

    Promise.all([api.worldHistory(), api.conversations(), api.me(), api.myDeeds()])
      .then(([hist, convs, meData, deedData]) => {
        s.setWorld(hist.messages);
        s.setConversations(convs.conversations);
        s.patchMe(meData.user);
        s.setOwned(meData.titles);
        s.setDeeds(deedData.deeds);
      })
      .catch((err) => s.setNotice(err instanceof Error ? err.message : "Sync failed"));

    return () => {
      socket.removeAllListeners();
      disconnectSocket();
    };
  }, [token]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, channel]);

  useEffect(() => {
    useNexus.getState().pruneExpired();
    const t = setInterval(() => useNexus.getState().pruneExpired(), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => useNexus.getState().setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  async function openDm(userId: string) {
    store.setChannel(userId);
    setHub("chat");
    if (!store.dms[userId]) {
      const hist = await api.dmHistory(userId);
      store.setDms(userId, hist.messages);
    }
  }

  async function openDmFromFriend(user: PublicUser) {
    await openDm(user.id);
    try {
      const d = await api.user(user.id);
      store.setProfile(d.user);
    } catch {
      /* profile is optional */
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const content = draft;
    if (!content.trim()) return;
    setDraft("");
    try {
      if (channel === "WORLD") {
        await emitWithAck("SEND_WORLD_MESSAGE", { content });
      } else {
        await emitWithAck("SEND_PRIVATE_MESSAGE", { toUserId: channel, content });
      }
    } catch (err) {
      store.setNotice(err instanceof Error ? err.message : "Send failed");
      setDraft(content);
    }
  }

  async function giveCoins() {
    if (!transfer) return;
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) {
      store.setNotice("Enter a positive amount");
      return;
    }
    setBusy(true);
    try {
      await emitWithAck("TRANSFER_COINS", {
        toUserId: transfer.user.id,
        amount: n,
        currency: transfer.currency,
      });
      store.setTransfer(null);
    } catch (err) {
      store.setNotice(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitDeed(e: FormEvent) {
    e.preventDefault();
    if (deedText.trim().length < 20) {
      store.setNotice("Deed must be at least 20 characters");
      return;
    }
    setBusy(true);
    try {
      await api.submitDeed(deedText.trim());
      const data = await api.myDeeds();
      store.setDeeds(data.deeds);
      setDeedText("");
      store.setNotice("Deed submitted for admin review");
    } catch (err) {
      store.setNotice(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function equip(titleId: string | null) {
    const data = await api.equip(titleId);
    store.patchMe(data.user);
  }

  async function logout() {
    await api.logout();
    disconnectSocket();
    store.reset();
  }

  async function deactivateAccount() {
    if (!window.confirm("Temporarily deactivate your account? You can return after an admin reactivates it.")) return;
    setBusy(true);
    try {
      await api.deactivateAccount();
      disconnectSocket();
      store.reset();
    } catch (err) {
      store.setNotice(err instanceof Error ? err.message : "Deactivate failed");
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your account from the server? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.deleteAccount();
      disconnectSocket();
      store.reset();
    } catch (err) {
      store.setNotice(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent text-white">
      <HudFX />
      <aside className="relative z-10 flex w-72 shrink-0 flex-col border-r border-cyan/25 bg-black/45 backdrop-blur-xl">
        <div className="border-b border-cyan/25 p-4">
          <p className="hud-live font-display text-[10px] tracking-[0.4em] text-cyan">GAIYA // LIVE</p>
          <h2 className="glitch mt-1 font-display text-lg text-white" data-text="Operators">Operators</h2>
        </div>
        <button
          onClick={() => store.setChannel("WORLD")}
          className={`mx-3 mt-3 flex min-h-[44px] items-center gap-2 rounded-sm px-3 py-2 text-left transition ${
            channel === "WORLD" ? "hud-btn hud-btn-fill text-ink" : "hud-btn text-cyan"
          }`}
        >
          <Users size={16} />
          World Channel
        </button>
        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {online
            .filter((u) => u.userId !== me.id && u.position !== "SYSTEM_OPERATOR")
            .map((u) => (
              <button
                key={u.userId}
                onClick={() => {
                  void openDm(u.userId);
                  void api.user(u.userId).then((d) => store.setProfile(d.user));
                }}
                className={`mb-2 flex min-h-[44px] w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition ${
                  channel === u.userId ? "bg-vio/30 shadow-neon" : "hover:bg-cyan/10"
                }`}
              >
                <Avatar name={u.username} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.username}</span>
                  <span className="block truncate text-xs text-cyan/80">
                    {u.positionLabel}
                    {u.title ? ` · ${u.title}` : ""}
                  </span>
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </button>
            ))}
          {conversations
            .filter((c) => !online.some((o) => o.userId === c.peerId))
            .map((c) => (
              <button
                key={c.peerId}
                onClick={() => void openDm(c.peerId)}
                className="mb-2 flex min-h-[44px] w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-white/60 hover:bg-cyan/10"
              >
                <Avatar name={c.username} />
                <span className="min-w-0">
                  <span className="block truncate">{c.username}</span>
                  <span className="block truncate text-xs">offline · {c.lastMessage}</span>
                </span>
              </button>
            ))}
        </div>
      </aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-cyan/25 bg-black/40 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="font-display text-[10px] tracking-[0.35em] text-gold">
              {channel === "WORLD" ? "WORLD BROADCAST" : "DIRECT LINK"}
            </p>
            <p className="glitch font-display text-xl" data-text={channel === "WORLD" ? "Global Grid" : peerName}>
              {channel === "WORLD" ? "Global Grid" : peerName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-chip rounded-sm px-3 py-1 text-[10px]">{me.positionLabel}</span>
            <button onClick={() => setHub("friends")} className="hud-btn flex min-h-[40px] items-center gap-1 rounded-sm px-3 py-1 text-[10px]">
              <UserPlus size={14} /> Friends
            </button>
            <button onClick={() => setHub("tasks")} className="hud-btn min-h-[40px] rounded-sm px-3 py-1 text-[10px]">
              Tasks
            </button>
            <button onClick={() => setHub("quarters")} className="hud-btn flex min-h-[40px] items-center gap-1 rounded-sm px-3 py-1 text-[10px]">
              <Map size={14} /> Quarters
            </button>
            <button onClick={() => setHub("corps")} className="hud-btn flex min-h-[40px] items-center gap-1 rounded-sm px-3 py-1 text-[10px]">
              <Swords size={14} /> Corps
            </button>
            <button onClick={() => setDeedOpen(true)} className="hud-btn min-h-[40px] rounded-sm px-3 py-1 text-[10px] text-mag">
              Deeds
            </button>
            <button onClick={() => setAccountOpen(true)} className="hud-btn min-h-[40px] rounded-sm px-3 py-1 text-[10px]">
              Account
            </button>
            <button onClick={() => void logout()} aria-label="Logout" className="hud-btn min-h-[40px] min-w-[40px] rounded-sm p-2 text-white/80">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {hub !== "chat" && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyan/20 px-5 py-2">
              <p className="font-display text-xs tracking-widest text-cyan">{hub.toUpperCase()}</p>
              <button onClick={() => setHub("chat")} className="hud-btn min-h-[36px] rounded-sm px-3 text-[10px]">
                Back to chat
              </button>
            </div>
            {hub === "friends" && <FriendsPanel onNotice={store.setNotice} onOpenDm={(u) => void openDmFromFriend(u)} />}
            {hub === "tasks" && <TasksPanel onNotice={store.setNotice} />}
            {hub === "quarters" && <QuartersPanel onNotice={store.setNotice} />}
            {hub === "corps" && <CorpsPanel onNotice={store.setNotice} />}
          </div>
        )}
        {hub === "chat" && (
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <article key={m.messageId} className="msg-in max-w-3xl">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    void api.user(m.senderId).then((d) => store.setProfile(d.user));
                  }}
                  className="font-display text-sm text-cyan hover:text-white"
                >
                  {m.senderUsername}
                </button>
                <span className="hud-chip rounded-sm px-1.5 py-0.5 text-[9px]">
                  {m.senderPositionLabel}
                </span>
                {m.senderTitle && (
                  <span className="rounded-sm border border-gold/50 px-1.5 py-0.5 font-display text-[10px] text-gold shadow-gold">
                    {m.senderTitle}
                  </span>
                )}
                <time className="font-mono text-[10px] text-white/40">{new Date(m.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="whitespace-pre-wrap break-words rounded-sm border border-cyan/20 bg-black/45 px-3 py-2 text-base leading-relaxed shadow-neon">
                {m.content}
              </p>
            </article>
          ))}
          {typing && <p className="text-xs text-cyan/70">{typing} is transmitting...</p>}
        </div>
        )}

        {hub === "chat" && (
        <form onSubmit={send} className="border-t border-cyan/25 bg-black/50 p-4 backdrop-blur-xl">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={draft}
                maxLength={MAX_CHARS}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const socketPayload = channel === "WORLD" ? { channel: "WORLD" } : { toUserId: channel };
                  connectSocket(token ?? undefined).emit("TYPING", socketPayload);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(e);
                  }
                }}
                placeholder={channel === "WORLD" ? "Broadcast to the grid..." : `Message ${peerName}...`}
                className="hud-area h-20 resize-none rounded-sm px-3 py-2"
              />
              <div className="mt-1 flex justify-between text-[10px] text-white/40">
                <span>
                  {me.username} · {me.positionLabel}
                  {me.activeTitle ? ` · ${me.activeTitle}` : ""}
                </span>
                <span>
                  {draft.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
            <button aria-label="Send" className="hud-btn hud-btn-fill flex h-12 w-12 items-center justify-center rounded-sm">
              <Send size={18} />
            </button>
          </div>
        </form>
        )}
      </section>

      <aside className="relative z-10 hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-cyan/25 bg-black/45 backdrop-blur-xl lg:flex">
        <SelfCard me={me} titles={ownedTitles} onEquip={equip} onOpenDeeds={() => setDeedOpen(true)} />
        {profile && profile.id !== me.id && (
          <ProfileCard
            user={profile}
            onCurrency={(c) => store.setTransfer({ user: profile, currency: c })}
            onDm={() => void openDm(profile.id)}
            onClose={() => store.setProfile(null)}
          />
        )}
      </aside>

      {profile && profile.id !== me.id && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60 p-4 lg:hidden">
          <div className="hud-panel w-full">
            <ProfileCard
              user={profile}
              onCurrency={(c) => store.setTransfer({ user: profile, currency: c })}
              onDm={() => void openDm(profile.id)}
              onClose={() => store.setProfile(null)}
            />
          </div>
        </div>
      )}

      {transfer && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
          <div className="hud-panel w-full max-w-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg" style={{ color: currencyColor(transfer.currency) }}>
                Send {currencyLabel(transfer.currency)}
              </h3>
              <button aria-label="Close" onClick={() => store.setTransfer(null)} className="hud-btn min-h-[40px] min-w-[40px] rounded-sm p-2">
                <X />
              </button>
            </div>
            <p className="mb-2 text-sm text-white/70">
              To {transfer.user.username} · they hold {transfer.user.wallet[transfer.currency as CurrencyType]?.toLocaleString() ?? 0}
            </p>
            <p className="mb-3 text-xs text-white/50">
              Your balance: {me.wallet[transfer.currency as CurrencyType]?.toLocaleString() ?? 0}
            </p>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="hud-input mb-3 rounded-sm px-3 py-2 text-lg"
              autoFocus
            />
            <button
              disabled={busy}
              onClick={() => void giveCoins()}
              className="hud-btn hud-btn-fill min-h-[44px] w-full rounded-sm py-2 text-sm disabled:opacity-50"
            >
              CONFIRM TRANSFER
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-sm border border-gold/60 bg-black/85 px-4 py-2 font-display text-sm text-gold shadow-gold">
          {notice}
        </div>
      )}

      {accountOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
          <div className="hud-panel w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-cyan">ACCOUNT</h3>
              <button aria-label="Close" onClick={() => setAccountOpen(false)} className="hud-btn min-h-[40px] min-w-[40px] rounded-sm p-2">
                <X />
              </button>
            </div>
            <p className="mb-4 text-sm text-white/70">
              Deactivate temporarily removes you from the grid. Delete permanently removes your account from the server.
              You can also file a request at{" "}
              <Link href="/delete-data" className="text-cyan underline">
                /delete-data
              </Link>
              . Policies:{" "}
              <Link href="/privacy" className="text-cyan underline">
                Privacy
              </Link>
              ,{" "}
              <Link href="/terms" className="text-cyan underline">
                Terms
              </Link>
              .
            </p>
            <button
              disabled={busy}
              onClick={() => void deactivateAccount()}
              className="hud-btn mb-2 min-h-[44px] w-full rounded-sm py-2 text-sm text-gold"
            >
              Deactivate
            </button>
            <button
              disabled={busy}
              onClick={() => void deleteAccount()}
              className="hud-btn min-h-[44px] w-full rounded-sm border-rose-500/60 py-2 text-sm text-rose-400"
            >
              Delete account
            </button>
          </div>
        </div>
      )}

      {deedOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
          <div className="hud-panel max-h-[85vh] w-full max-w-xl overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-cyan">DEEDS AND TITLES</h3>
              <button aria-label="Close" onClick={() => setDeedOpen(false)} className="hud-btn min-h-[40px] min-w-[40px] rounded-sm p-2">
                <X />
              </button>
            </div>
            <p className="mb-3 text-sm text-white/70">
              Titles are not purchased. Submit a deed of extraordinary work. An admin reviews it, creates a title, and grants it.
            </p>
            <form onSubmit={submitDeed} className="mb-5">
              <textarea
                value={deedText}
                onChange={(e) => setDeedText(e.target.value)}
                maxLength={2000}
                placeholder="Describe the deed you achieved..."
                className="hud-area h-28 rounded-sm px-3 py-2"
              />
              <button disabled={busy} className="hud-btn hud-btn-fill mt-2 min-h-[44px] w-full rounded-sm py-2 text-sm">
                SUBMIT DEED
              </button>
            </form>
            <h4 className="mb-2 font-display text-xs tracking-widest text-gold">GRANTED TITLES</h4>
            {ownedTitles.length === 0 && <p className="mb-4 text-sm text-white/40">None yet.</p>}
            <div className="mb-5 space-y-2">
              {ownedTitles.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-sm border border-cyan/20 bg-black/30 p-3">
                  <div>
                    <p className="font-display text-gold">{t.name}</p>
                    <p className="text-xs text-white/60">{t.description}</p>
                  </div>
                  <button
                    disabled={me.activeTitleId === t.id}
                    onClick={() => void equip(t.id)}
                    className="hud-btn min-h-[36px] rounded-sm px-3 py-1 text-xs disabled:opacity-40"
                  >
                    {me.activeTitleId === t.id ? "ACTIVE" : "EQUIP"}
                  </button>
                </div>
              ))}
            </div>
            <h4 className="mb-2 font-display text-xs tracking-widest text-gold">YOUR DEEDS</h4>
            <div className="space-y-2">
              {deeds.map((d) => (
                <div key={d.id} className="rounded-sm border border-cyan/20 bg-black/30 p-3 text-sm">
                  <p className="text-white/80">{d.content}</p>
                  <p className="mt-1 text-xs text-cyan">
                    {d.status}
                    {d.titleName ? ` · ${d.titleName}` : ""}
                    {d.adminNote ? ` · ${d.adminNote}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-cyan/40 bg-cyan/15 font-display text-xs text-cyan shadow-neon">
      {initials(name)}
    </span>
  );
}

function WalletGrid({
  wallet,
  clickable,
  onClick,
}: {
  wallet: PublicUser["wallet"];
  clickable?: boolean;
  onClick?: (c: CurrencyType) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-1">
      {CURRENCY_TYPES.map((c) => (
        <button
          key={c}
          type="button"
          disabled={!clickable}
          onClick={() => onClick?.(c)}
          className="flex min-h-[36px] items-center justify-between rounded-sm border bg-black/40 px-2 py-1 text-left text-[10px] shadow-[0_0_10px_rgba(34,240,255,0.12)] disabled:cursor-default"
          style={{ borderColor: `${currencyColor(c)}44`, color: currencyColor(c) }}
        >
          <span>{currencyShort(c)}</span>
          <span className="font-display">{wallet[c].toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

function SelfCard({
  me,
  titles,
  onEquip,
  onOpenDeeds,
}: {
  me: PublicUser;
  titles: { id: string; name: string }[];
  onEquip: (id: string | null) => void;
  onOpenDeeds: () => void;
}) {
  return (
    <div className="border-b border-cyan/25 p-5">
      <div className="flex items-center gap-3">
        <Avatar name={me.username} />
        <div>
          <p className="font-display">{me.username}</p>
          <p className="text-xs text-cyan">{me.positionLabel}</p>
          {me.nextPositionLabel && <p className="text-[10px] text-gold">Next visible: {me.nextPositionLabel}</p>}
        </div>
      </div>
      <p className="mt-3 text-sm text-white/70">{me.bio || "No bio uplink."}</p>
      {me.stateLabel && (
        <p className="mt-1 text-[10px] text-white/40">
          {me.countryLabel} · {me.stateLabel} · {me.regionLabel} · {me.areaLabel}
        </p>
      )}
      {me.activeTitle && <p className="mt-1 text-xs text-gold">Title: {me.activeTitle}</p>}
      <WalletGrid wallet={me.wallet} />
      <button onClick={onOpenDeeds} className="hud-btn mt-3 min-h-[40px] w-full rounded-sm py-1 text-xs text-gold">
        Submit Deed / Titles
      </button>
      {titles.length > 0 && (
        <button onClick={() => onEquip(null)} className="mt-2 w-full text-xs text-white/40">
          Unequip title
        </button>
      )}
    </div>
  );
}

function ProfileCard({
  user,
  onCurrency,
  onDm,
  onClose,
}: {
  user: PublicUser;
  onCurrency: (c: CurrencyType) => void;
  onDm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-display text-lg">{user.username}</p>
          <p className="text-xs text-cyan">{user.positionLabel}</p>
          {user.activeTitle && <p className="text-xs text-gold">{user.activeTitle}</p>}
        </div>
        <button aria-label="Close" onClick={onClose} className="hud-btn min-h-[36px] min-w-[36px] rounded-sm p-1 text-white/70">
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-white/70">{user.bio || "No bio uplink."}</p>
      <p className="mt-2 text-[10px] tracking-widest text-white/40">CLICK A CURRENCY TO SEND</p>
      <WalletGrid wallet={user.wallet} clickable onClick={onCurrency} />
      <button onClick={onDm} className="hud-btn mt-3 flex min-h-[40px] w-full items-center justify-center gap-1 rounded-sm py-1 text-sm">
        <MessageSquare size={14} /> Open DM
      </button>
    </div>
  );
}
