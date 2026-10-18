import { prisma } from "./prisma";

const ADJ = ["Neon", "Shadow", "Grid", "Void", "Arc", "Nova", "Pulse", "Cipher", "Iron", "Aether"];
const NOUN = ["Runner", "Blade", "Walker", "Viper", "Warden", "Scout", "Forge", "Spark", "Drift", "Hex"];

function randomHandle(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const b = NOUN[Math.floor(Math.random() * NOUN.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}${b}${n}`;
}

export async function generateUniqueUsername(): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    const candidate = randomHandle();
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `Op${Date.now().toString(36).slice(-8)}`;
}
