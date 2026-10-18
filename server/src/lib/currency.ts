export const CURRENCY_TYPES = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "LEADER",
  "COMMANDER",
  "SUPREME",
  "DIVINE",
  "CELESTIAL",
  "GODLY",
  "SYSTEM",
] as const;

export type CurrencyType = (typeof CURRENCY_TYPES)[number];

export const CURRENCY_META: Record<
  CurrencyType,
  { key: string; label: string; short: string; color: string; column: WalletColumn }
> = {
  BRONZE: { key: "bronze", label: "Bronze Coins", short: "BRZ", color: "#cd7f32", column: "bronze" },
  SILVER: { key: "silver", label: "Silver Coins", short: "SLV", color: "#c0c7d1", column: "silver" },
  GOLD: { key: "gold", label: "Gold Coins", short: "GLD", color: "#f5c542", column: "goldCoins" },
  LEADER: { key: "leader", label: "Leader Coins", short: "LDR", color: "#4ade80", column: "leader" },
  COMMANDER: { key: "commander", label: "Commander Coins", short: "CMD", color: "#22f0ff", column: "commander" },
  SUPREME: { key: "supreme", label: "Supreme Coins", short: "SUP", color: "#9b5cff", column: "supreme" },
  DIVINE: { key: "divine", label: "Divine Coins", short: "DIV", color: "#ff4fd8", column: "divine" },
  CELESTIAL: { key: "celestial", label: "Celestial Coins", short: "CEL", color: "#7dd3fc", column: "celestial" },
  GODLY: { key: "godly", label: "Godly Coins", short: "GOD", color: "#fb923c", column: "godly" },
  SYSTEM: { key: "system", label: "System Coins", short: "SYS", color: "#ffffff", column: "system" },
};

export type WalletColumn =
  | "bronze"
  | "silver"
  | "goldCoins"
  | "leader"
  | "commander"
  | "supreme"
  | "divine"
  | "celestial"
  | "godly"
  | "system";

export const STARTING_WALLET: Record<WalletColumn, number> = {
  bronze: 500,
  silver: 0,
  goldCoins: 0,
  leader: 0,
  commander: 0,
  supreme: 0,
  divine: 0,
  celestial: 0,
  godly: 0,
  system: 0,
};

export function isCurrencyType(value: string): value is CurrencyType {
  return (CURRENCY_TYPES as readonly string[]).includes(value);
}

export function walletSnapshot(user: Record<WalletColumn, number>) {
  return {
    BRONZE: user.bronze,
    SILVER: user.silver,
    GOLD: user.goldCoins,
    LEADER: user.leader,
    COMMANDER: user.commander,
    SUPREME: user.supreme,
    DIVINE: user.divine,
    CELESTIAL: user.celestial,
    GODLY: user.godly,
    SYSTEM: user.system,
  };
}

export function currencyLabel(type: CurrencyType): string {
  return CURRENCY_META[type].label;
}

export function currencyColumn(type: CurrencyType): WalletColumn {
  return CURRENCY_META[type].column;
}
