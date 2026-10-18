import type { CurrencyType, WalletMap } from "./currency";

export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  position: string;
  positionLabel: string;
  nextPosition?: string | null;
  nextPositionLabel?: string | null;
  wallet: WalletMap;
  bio: string;
  equippedBadge: string;
  activeTitle: string;
  activeTitleId: string | null;
  gender?: string;
  age?: number | null;
  bloodType?: string;
  realName?: string;
  country?: string;
  state?: string;
  region?: string;
  area?: string;
  countryLabel?: string;
  stateLabel?: string;
  regionLabel?: string;
  areaLabel?: string;
  partnerUsername?: string | null;
  partyId?: string | null;
  status?: string;
  introSeen?: boolean;
  createdAt: string;
}

export interface ChatPayload {
  messageId: string;
  senderId: string;
  senderUsername: string;
  senderTitle: string;
  senderPosition: string;
  senderPositionLabel: string;
  senderBadge: string;
  recipientId: string | null;
  channelType: string;
  content: string;
  timestamp: string;
}

export interface PresenceUser {
  userId: string;
  username: string;
  position: string;
  positionLabel: string;
  title: string;
  badge: string;
  wallet: WalletMap;
}

export interface OwnedTitle {
  id: string;
  name: string;
  description: string;
  badgeId: string;
  unlockedAt: string;
}

export interface CoinEvent {
  transactionId: string;
  amount: number;
  currency: CurrencyType;
  currencyLabel: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  timestamp: string;
}

export interface Conversation {
  peerId: string;
  username: string;
  title: string;
  position: string;
  lastMessage: string;
  lastAt: string;
}

export interface Deed {
  id: string;
  content: string;
  status: string;
  adminNote: string;
  titleName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user?: { id: string; username: string; email: string; position: string };
}

export interface FriendRow {
  id: string;
  status: string;
  createdAt: string;
  user: PublicUser;
}

export interface GameTask {
  id: string;
  title: string;
  description: string;
}

export interface TaskAssignment {
  id: string;
  status: string;
  report: string;
  adminNote: string;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt?: string | null;
  task: GameTask;
  user?: { id: string; username: string; email?: string; realName?: string };
}

export interface UpgradeRow {
  id: string;
  fromPosition: string;
  toPosition: string;
  fromLabel: string;
  toLabel: string;
  note: string;
  status: string;
  adminNote: string;
  createdAt: string;
  user?: PublicUser;
}

export interface LocationNode {
  id: string;
  label: string;
  count: number;
  users: PublicUser[];
  children: LocationNode[];
}

export interface QuarterMarker {
  state: string;
  label: string;
  short: string;
  x: number;
  y: number;
  count: number;
}

export interface AuthOptions {
  countries: { id: string; label: string }[];
  states: { id: string; label: string }[];
  regions: { id: string; label: string }[];
  areas: { id: string; label: string }[];
  genders: { id: string; label: string }[];
  bloodTypes: string[];
}
