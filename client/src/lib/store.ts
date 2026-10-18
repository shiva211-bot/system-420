import { create } from "zustand";
import type { ChatPayload, CoinEvent, Conversation, Deed, OwnedTitle, PresenceUser, PublicUser } from "./types";

export const MESSAGE_TTL_MS = 60 * 60 * 1000;

function isFresh(message: ChatPayload, now = Date.now()) {
  return now - new Date(message.timestamp).getTime() < MESSAGE_TTL_MS;
}

function pruneList(messages: ChatPayload[], now = Date.now()) {
  return messages.filter((m) => isFresh(m, now));
}

interface NexusState {
  token: string | null;
  me: PublicUser | null;
  ownedTitles: OwnedTitle[];
  deeds: Deed[];
  online: PresenceUser[];
  world: ChatPayload[];
  dms: Record<string, ChatPayload[]>;
  conversations: Conversation[];
  channel: "WORLD" | string;
  profile: PublicUser | null;
  notice: string | null;
  typing: string | null;
  transfer: { user: PublicUser; currency: string } | null;
  setAuth: (token: string | null, me: PublicUser | null) => void;
  setOwned: (titles: OwnedTitle[]) => void;
  setDeeds: (deeds: Deed[]) => void;
  setOnline: (users: PresenceUser[]) => void;
  patchPresence: (user: PresenceUser) => void;
  setWorld: (messages: ChatPayload[]) => void;
  pushWorld: (message: ChatPayload) => void;
  setDms: (userId: string, messages: ChatPayload[]) => void;
  pushDm: (message: ChatPayload, meId: string) => void;
  setConversations: (rows: Conversation[]) => void;
  setChannel: (channel: "WORLD" | string) => void;
  setProfile: (user: PublicUser | null) => void;
  patchMe: (user: PublicUser) => void;
  setNotice: (notice: string | null) => void;
  setTyping: (name: string | null) => void;
  setTransfer: (payload: { user: PublicUser; currency: string } | null) => void;
  applyCoinEvent: (event: CoinEvent, meId: string) => void;
  dropMessages: (messageIds: string[]) => void;
  pruneExpired: () => void;
  reset: () => void;
}

export const useNexus = create<NexusState>((set, get) => ({
  token: null,
  me: null,
  ownedTitles: [],
  deeds: [],
  online: [],
  world: [],
  dms: {},
  conversations: [],
  channel: "WORLD",
  profile: null,
  notice: null,
  typing: null,
  transfer: null,
  setAuth: (token, me) => set({ token, me }),
  setOwned: (ownedTitles) => set({ ownedTitles }),
  setDeeds: (deeds) => set({ deeds }),
  setOnline: (online) => set({ online }),
  patchPresence: (user) =>
    set({
      online: get().online.some((u) => u.userId === user.userId)
        ? get().online.map((u) => (u.userId === user.userId ? user : u))
        : [...get().online, user],
    }),
  setWorld: (world) => set({ world: pruneList(world) }),
  pushWorld: (message) =>
    set({
      world: get().world.some((m) => m.messageId === message.messageId) || !isFresh(message)
        ? pruneList(get().world)
        : [...pruneList(get().world), message],
    }),
  setDms: (userId, messages) => set({ dms: { ...get().dms, [userId]: pruneList(messages) } }),
  pushDm: (message, meId) => {
    const peerId = message.senderId === meId ? message.recipientId : message.senderId;
    if (!peerId || !isFresh(message)) return;
    const existing = pruneList(get().dms[peerId] ?? []);
    if (existing.some((m) => m.messageId === message.messageId)) return;
    set({ dms: { ...get().dms, [peerId]: [...existing, message] } });
  },
  setConversations: (conversations) => set({ conversations }),
  setChannel: (channel) => set({ channel }),
  setProfile: (profile) => set({ profile }),
  patchMe: (user) => set({ me: user }),
  setNotice: (notice) => set({ notice }),
  setTyping: (typing) => set({ typing }),
  setTransfer: (transfer) => set({ transfer }),
  dropMessages: (messageIds) => {
    const gone = new Set(messageIds);
    const dms: Record<string, ChatPayload[]> = {};
    for (const [peerId, rows] of Object.entries(get().dms)) {
      dms[peerId] = rows.filter((m) => !gone.has(m.messageId));
    }
    set({
      world: get().world.filter((m) => !gone.has(m.messageId)),
      dms,
    });
  },
  pruneExpired: () => {
    const now = Date.now();
    const dms: Record<string, ChatPayload[]> = {};
    for (const [peerId, rows] of Object.entries(get().dms)) {
      dms[peerId] = pruneList(rows, now);
    }
    set({ world: pruneList(get().world, now), dms });
  },
  applyCoinEvent: (event, meId) => {
    const label = event.currencyLabel || event.currency;
    if (event.receiverId === meId) {
      set({ notice: `+${event.amount} ${label} from ${event.senderUsername}` });
    } else if (event.senderId === meId) {
      set({ notice: `Sent ${event.amount} ${label} to ${event.receiverUsername}` });
    }
  },
  reset: () =>
    set({
      token: null,
      me: null,
      ownedTitles: [],
      deeds: [],
      online: [],
      world: [],
      dms: {},
      conversations: [],
      channel: "WORLD",
      profile: null,
      notice: null,
      typing: null,
      transfer: null,
    }),
}));
