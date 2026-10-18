import type {
  AuthOptions,
  ChatPayload,
  Conversation,
  Deed,
  FriendRow,
  GameTask,
  LocationNode,
  OwnedTitle,
  PublicUser,
  QuarterMarker,
  TaskAssignment,
  UpgradeRow,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Request failed (${res.status})`) as Error & {
      status?: number;
      retryAfter?: number;
      fieldErrors?: Record<string, string[]>;
    };
    err.status = res.status;
    const retryAfter = (data as { retryAfter?: number }).retryAfter;
    if (typeof retryAfter === "number") err.retryAfter = retryAfter;
    const fieldErrors = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details?.fieldErrors;
    if (fieldErrors) err.fieldErrors = fieldErrors;
    throw err;
  }
  return data as T;
}

export const api = {
  register: (body: Record<string, unknown>) =>
    request<{ ok: boolean; message: string; pending?: boolean; ticket?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { identifier: string; password: string }) =>
    request<{ token: string; user: PublicUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  verifyOtp: (ticket: string, otp: string) =>
    request<{ ok: boolean; username: string; message: string }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ ticket, otp }),
    }),
  otpStatus: (ticket: string) =>
    request<{ ok: boolean; locked: boolean; retryAfter: number; lockSec: number }>(
      `/api/auth/otp-status?ticket=${encodeURIComponent(ticket)}`,
    ),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  requestDeletion: (body: { email: string; reason?: string }) =>
    request<{ ok: boolean; message: string }>("/api/privacy/delete-request", { method: "POST", body: JSON.stringify(body) }),
  deactivateAccount: () => request<{ ok: boolean; status: string }>("/api/account/deactivate", { method: "POST" }),
  deleteAccount: () => request<{ ok: boolean; deleted: boolean }>("/api/account/delete", { method: "POST" }),
  markIntroSeen: () => request<{ ok: boolean }>("/api/account/intro-seen", { method: "POST" }),
  me: () => request<{ user: PublicUser; titles: OwnedTitle[] }>("/api/auth/me"),
  options: () => request<AuthOptions>("/api/auth/options"),
  worldHistory: () => request<{ messages: ChatPayload[] }>("/api/chat/world"),
  dmHistory: (userId: string) => request<{ messages: ChatPayload[] }>(`/api/chat/dm/${userId}`),
  conversations: () => request<{ conversations: Conversation[] }>("/api/chat/conversations"),
  myTitles: () => request<{ titles: OwnedTitle[] }>("/api/titles/mine"),
  equip: (titleId: string | null) => request<{ user: PublicUser }>("/api/titles/equip", { method: "POST", body: JSON.stringify({ titleId }) }),
  submitDeed: (content: string) => request<{ deed: Deed }>("/api/titles/deeds", { method: "POST", body: JSON.stringify({ content }) }),
  myDeeds: () => request<{ deeds: Deed[] }>("/api/titles/deeds"),
  transfer: (body: { toUserId?: string; toUsername?: string; amount: number; currency: string }) =>
    request<{ sender: PublicUser; receiver: PublicUser }>("/api/economy/transfer", { method: "POST", body: JSON.stringify(body) }),
  profile: (bio: string) => request<{ user: PublicUser }>("/api/profile", { method: "PATCH", body: JSON.stringify({ bio }) }),
  user: (id: string) => request<{ user: PublicUser }>(`/api/users/${id}`),
  quarters: () => request<{ markers: QuarterMarker[] }>("/api/quarters"),
  friends: () => request<{ incoming: FriendRow[]; outgoing: FriendRow[]; friends: FriendRow[] }>("/api/friends"),
  friendRequest: (username: string) =>
    request<{ request: { id: string; status: string } }>("/api/friends/request", { method: "POST", body: JSON.stringify({ username }) }),
  friendRespond: (requestId: string, action: "ACCEPT" | "DECLINE") =>
    request<{ request: { id: string; status: string } }>("/api/friends/respond", { method: "POST", body: JSON.stringify({ requestId, action }) }),
  orgs: () =>
    request<{
      memberships: { orgId: string; role: string; type: string; name: string; leader: string }[];
      partyId: string | null;
      openParties: { id: string; name: string; leader: string; memberCount: number; maxMembers: number }[];
    }>("/api/orgs"),
  createOrg: (body: { type: string; name: string; parentId?: string }) =>
    request<{ org: unknown }>("/api/orgs", { method: "POST", body: JSON.stringify(body) }),
  joinParty: (orgId: string) => request<{ org: unknown }>("/api/orgs/join", { method: "POST", body: JSON.stringify({ orgId }) }),
  leaveParty: () => request<{ ok: boolean }>("/api/orgs/leave", { method: "POST" }),
  attachOrg: (parentId: string, childId: string) =>
    request<{ parent: unknown }>("/api/orgs/attach", { method: "POST", body: JSON.stringify({ parentId, childId }) }),
  tasks: () => request<{ tasks: GameTask[]; assignments: TaskAssignment[] }>("/api/tasks"),
  selectTask: (taskId: string) => request<{ assignment: TaskAssignment }>("/api/tasks/select", { method: "POST", body: JSON.stringify({ taskId }) }),
  reportTask: (assignmentId: string, report: string) =>
    request<{ assignment: TaskAssignment }>("/api/tasks/report", { method: "POST", body: JSON.stringify({ assignmentId, report }) }),
  upgrades: () =>
    request<{ current: string; currentLabel: string; next: string | null; nextLabel: string | null; requests: UpgradeRow[] }>("/api/upgrades"),
  requestUpgrade: (note?: string) =>
    request<{ request: UpgradeRow }>("/api/upgrades", { method: "POST", body: JSON.stringify({ note }) }),
  adminUsers: (q = "") => request<{ users: PublicUser[]; positions: { id: string; label: string }[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`),
  adminSetPosition: (userId: string, position: string) =>
    request<{ user: PublicUser }>("/api/admin/position", { method: "POST", body: JSON.stringify({ userId, position }) }),
  adminGrantCurrency: (userId: string, currency: string, amount: number) =>
    request<{ user: PublicUser }>("/api/admin/grant-currency", { method: "POST", body: JSON.stringify({ userId, currency, amount }) }),
  adminDeeds: () => request<{ deeds: Deed[] }>("/api/admin/deeds"),
  adminReviewDeed: (body: { deedId: string; action: "REJECT" | "GRANT"; adminNote?: string; titleName?: string; titleDescription?: string }) =>
    request<{ user?: PublicUser; deed?: { id: string; status: string } }>("/api/admin/deeds/review", { method: "POST", body: JSON.stringify(body) }),
  adminGrantTitle: (body: { userId: string; name: string; description: string; deedId?: string }) =>
    request<{ user: PublicUser }>("/api/admin/titles/grant", { method: "POST", body: JSON.stringify(body) }),
  adminLocations: () => request<{ tree: LocationNode[] }>("/api/admin/locations"),
  adminUpgrades: () => request<{ requests: UpgradeRow[] }>("/api/admin/upgrades"),
  adminReviewUpgrade: (requestId: string, action: "APPROVE" | "REJECT", adminNote?: string) =>
    request<{ user?: PublicUser; request?: { id: string; status: string } }>("/api/admin/upgrades/review", {
      method: "POST",
      body: JSON.stringify({ requestId, action, adminNote }),
    }),
  adminTasks: () => request<{ reports: TaskAssignment[] }>("/api/admin/tasks"),
  adminReviewTask: (assignmentId: string, action: "APPROVE" | "REJECT", adminNote?: string) =>
    request<{ assignment: { id: string; status: string } }>("/api/admin/tasks/review", {
      method: "POST",
      body: JSON.stringify({ assignmentId, action, adminNote }),
    }),
  adminDeleteUser: (userId: string) =>
    request<{ ok: boolean; deleted: string }>("/api/admin/users/delete", { method: "POST", body: JSON.stringify({ userId }) }),
  adminSetStatus: (userId: string, status: "ACTIVE" | "DEACTIVATED") =>
    request<{ user: PublicUser }>("/api/admin/users/status", { method: "POST", body: JSON.stringify({ userId, status }) }),
};
