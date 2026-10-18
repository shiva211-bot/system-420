export const BADGE_COLORS: Record<string, string> = {
  novice: "#7aa0b8",
  street: "#22f0ff",
  shadow: "#9b5cff",
  explorer: "#f5c542",
  prophet: "#ff4fd8",
  grandmaster: "#ff6a3d",
  sovereign: "#ffffff",
};

export function badgeColor(id: string): string {
  return BADGE_COLORS[id] ?? "#22f0ff";
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
