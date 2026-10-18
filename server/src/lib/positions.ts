import type { WalletColumn } from "./currency";

export const POSITIONS = [
  "PLAYER",
  "PARTY_LEADER",
  "CLAN_LEADER",
  "GROUP_LEADER",
  "COMMANDER",
  "RULER",
  "SUPREME_COMMANDER",
  "SUPREME_RULER",
  "DIVINER",
  "CELESTIAL",
  "GOD",
  "SYSTEM_OPERATOR",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_META: Record<Position, { label: string; color: string }> = {
  PLAYER: { label: "Player", color: "#cd7f32" },
  PARTY_LEADER: { label: "Party Leader", color: "#c0c7d1" },
  CLAN_LEADER: { label: "Clan Leader", color: "#f5c542" },
  GROUP_LEADER: { label: "Group Leader", color: "#4ade80" },
  COMMANDER: { label: "Commander", color: "#22f0ff" },
  RULER: { label: "Ruler", color: "#9b5cff" },
  SUPREME_COMMANDER: { label: "Supreme Commander", color: "#fb923c" },
  SUPREME_RULER: { label: "Supreme Ruler", color: "#ff4fd8" },
  DIVINER: { label: "Diviner", color: "#e879f9" },
  CELESTIAL: { label: "Celestial", color: "#7dd3fc" },
  GOD: { label: "God", color: "#fde047" },
  SYSTEM_OPERATOR: { label: "System Operator", color: "#ffffff" },
};

type Grant = Partial<Record<WalletColumn, number>>;

export const POSITION_GRANTS: Record<Position, Grant> = {
  PLAYER: { bronze: 1000 },
  PARTY_LEADER: { silver: 100, bronze: 5000 },
  CLAN_LEADER: { goldCoins: 10, silver: 100, bronze: 5000 },
  GROUP_LEADER: { leader: 10, goldCoins: 100, silver: 1000, bronze: 10000 },
  COMMANDER: { commander: 10, leader: 100, goldCoins: 1000, silver: 1000, bronze: 10000 },
  RULER: { commander: 100, leader: 1000, goldCoins: 10000 },
  SUPREME_COMMANDER: { supreme: 10, commander: 1000, leader: 10000 },
  SUPREME_RULER: { supreme: 100, commander: 10000 },
  DIVINER: { divine: 10, supreme: 1000, commander: 100000 },
  CELESTIAL: { celestial: 10, divine: 1000, supreme: 10000 },
  GOD: { godly: 10, celestial: 1000, divine: 10000 },
  SYSTEM_OPERATOR: { system: 10, godly: 1000, celestial: 10000 },
};

export function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value);
}

export function positionRank(position: Position): number {
  return POSITIONS.indexOf(position);
}

export function positionLabel(position: string): string {
  if (isPosition(position)) return POSITION_META[position].label;
  return position;
}

export function grantsBetween(from: Position, to: Position): Grant {
  const start = positionRank(from);
  const end = positionRank(to);
  if (end <= start) return {};
  const merged: Grant = {};
  for (let i = start + 1; i <= end; i += 1) {
    const grant = POSITION_GRANTS[POSITIONS[i]];
    for (const [col, amount] of Object.entries(grant)) {
      const key = col as WalletColumn;
      merged[key] = (merged[key] ?? 0) + (amount ?? 0);
    }
  }
  return merged;
}

export function grantToIncrement(grant: Grant): Partial<Record<WalletColumn, { increment: number }>> {
  const data: Partial<Record<WalletColumn, { increment: number }>> = {};
  for (const [col, amount] of Object.entries(grant)) {
    if (!amount) continue;
    data[col as WalletColumn] = { increment: amount };
  }
  return data;
}

export function nextPosition(position: string): Position | null {
  if (!isPosition(position)) return "PLAYER";
  const idx = positionRank(position);
  const next = POSITIONS[idx + 1];
  if (!next || next === "SYSTEM_OPERATOR") return null;
  return next;
}

export function canSeePosition(viewerPosition: string, targetPosition: string, opts: { admin?: boolean; self?: boolean }): boolean {
  if (opts.admin || opts.self) return true;
  const viewer = isPosition(viewerPosition) ? positionRank(viewerPosition) : 0;
  const target = isPosition(targetPosition) ? positionRank(targetPosition) : 0;
  return target <= viewer + 1;
}

export const ORG_TYPES = [
  "PARTY",
  "CLAN",
  "GROUP",
  "COMMAND",
  "RULE",
  "SUPREME_COMMAND",
  "SUPREME_RULE",
  "DIVINE_COURT",
  "CELESTIAL_COURT",
  "GOD_COURT",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_RULES: Record<
  OrgType,
  {
    label: string;
    minLeader: Position;
    minMembers: number;
    maxMembers: number;
    minChildren: number;
    maxChildren: number;
    childTypes: OrgType[];
  }
> = {
  PARTY: {
    label: "Party",
    minLeader: "PARTY_LEADER",
    minMembers: 1,
    maxMembers: 5,
    minChildren: 0,
    maxChildren: 0,
    childTypes: [],
  },
  CLAN: {
    label: "Clan",
    minLeader: "CLAN_LEADER",
    minMembers: 8,
    maxMembers: 20,
    minChildren: 2,
    maxChildren: 3,
    childTypes: ["PARTY"],
  },
  GROUP: {
    label: "Group",
    minLeader: "GROUP_LEADER",
    minMembers: 40,
    maxMembers: 60,
    minChildren: 3,
    maxChildren: 3,
    childTypes: ["CLAN"],
  },
  COMMAND: {
    label: "Command",
    minLeader: "COMMANDER",
    minMembers: 1,
    maxMembers: 400,
    minChildren: 1,
    maxChildren: 5,
    childTypes: ["GROUP"],
  },
  RULE: {
    label: "Rule",
    minLeader: "RULER",
    minMembers: 1,
    maxMembers: 2000,
    minChildren: 1,
    maxChildren: 3,
    childTypes: ["COMMAND"],
  },
  SUPREME_COMMAND: {
    label: "Supreme Command",
    minLeader: "SUPREME_COMMANDER",
    minMembers: 1,
    maxMembers: 5000,
    minChildren: 1,
    maxChildren: 8,
    childTypes: ["RULE"],
  },
  SUPREME_RULE: {
    label: "Supreme Rule",
    minLeader: "SUPREME_RULER",
    minMembers: 1,
    maxMembers: 20000,
    minChildren: 1,
    maxChildren: 50,
    childTypes: ["SUPREME_COMMAND", "RULE", "COMMAND", "GROUP"],
  },
  DIVINE_COURT: {
    label: "Divine Court",
    minLeader: "DIVINER",
    minMembers: 1,
    maxMembers: 50000,
    minChildren: 1,
    maxChildren: 20,
    childTypes: ["SUPREME_RULE"],
  },
  CELESTIAL_COURT: {
    label: "Celestial Court",
    minLeader: "CELESTIAL",
    minMembers: 1,
    maxMembers: 100000,
    minChildren: 1,
    maxChildren: 20,
    childTypes: ["DIVINE_COURT"],
  },
  GOD_COURT: {
    label: "God Court",
    minLeader: "GOD",
    minMembers: 1,
    maxMembers: 200000,
    minChildren: 1,
    maxChildren: 20,
    childTypes: ["CELESTIAL_COURT"],
  },
};

export function isOrgType(value: string): value is OrgType {
  return (ORG_TYPES as readonly string[]).includes(value);
}

export function meetsLeaderRank(position: string, minLeader: Position): boolean {
  if (!isPosition(position)) return false;
  return positionRank(position) >= positionRank(minLeader);
}
