export function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 75;
}

export function applyXp(currentLevel: number, currentXp: number, gained: number): { level: number; xp: number } {
  let level = currentLevel;
  let xp = currentXp + gained;
  let needed = xpRequiredForLevel(level);
  while (xp >= needed) {
    xp -= needed;
    level += 1;
    needed = xpRequiredForLevel(level);
  }
  return { level, xp };
}
