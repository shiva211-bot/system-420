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

export type WalletMap = Record<CurrencyType, number>;

export const CURRENCY_META: Record<CurrencyType, { label: string; short: string; color: string }> = {
  BRONZE: { label: "Bronze Coins", short: "BRZ", color: "#cd7f32" },
  SILVER: { label: "Silver Coins", short: "SLV", color: "#c0c7d1" },
  GOLD: { label: "Gold Coins", short: "GLD", color: "#f5c542" },
  LEADER: { label: "Leader Coins", short: "LDR", color: "#4ade80" },
  COMMANDER: { label: "Commander Coins", short: "CMD", color: "#22f0ff" },
  SUPREME: { label: "Supreme Coins", short: "SUP", color: "#9b5cff" },
  DIVINE: { label: "Divine Coins", short: "DIV", color: "#ff4fd8" },
  CELESTIAL: { label: "Celestial Coins", short: "CEL", color: "#7dd3fc" },
  GODLY: { label: "Godly Coins", short: "GOD", color: "#fb923c" },
  SYSTEM: { label: "System Coins", short: "SYS", color: "#ffffff" },
};

export const EMPTY_WALLET: WalletMap = {
  BRONZE: 0,
  SILVER: 0,
  GOLD: 0,
  LEADER: 0,
  COMMANDER: 0,
  SUPREME: 0,
  DIVINE: 0,
  CELESTIAL: 0,
  GODLY: 0,
  SYSTEM: 0,
};

export function currencyLabel(type: string): string {
  return CURRENCY_META[type as CurrencyType]?.label ?? type;
}

export function currencyColor(type: string): string {
  return CURRENCY_META[type as CurrencyType]?.color ?? "#f5c542";
}

export function currencyShort(type: string): string {
  return CURRENCY_META[type as CurrencyType]?.short ?? type;
}
