import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STARTING_WALLET } from "../src/lib/currency";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "ss281180@@", 12);
  const playerPassword = await bcrypt.hash("nexus1234", 12);

  await prisma.gameTask.deleteMany();
  await prisma.gameTask.createMany({
    data: [
      { title: "Grid Patrol", description: "Walk your assigned sector and report anomalies on the live channel." },
      { title: "Supply Run", description: "Move bronze between operators without overspend. Log each hop." },
      { title: "Recruit Sweep", description: "Invite a free player into an open party and confirm the roster." },
      { title: "Deed Record", description: "Document one field action for admin title review." },
      { title: "Quarter Watch", description: "Confirm your state marker on the India quarters map." },
    ],
  });

  await prisma.user.upsert({
    where: { email: "admin@nexus.local" },
    update: {
      role: "ADMIN",
      position: "SYSTEM_OPERATOR",
      passwordHash: adminPassword,
      realName: "System Operator",
      gender: "MALE",
      age: 40,
      country: "INDIA",
      state: "MAHARASHTRA",
      region: "TRISHUL",
      area: "CORE",
      emailVerified: new Date(),
    },
    create: {
      username: "SHIVASAHU",
      email: "admin@nexus.local",
      passwordHash: adminPassword,
      role: "ADMIN",
      position: "SYSTEM_OPERATOR",
      ...STARTING_WALLET,
      system: 100,
      bio: "Grid administrator.",
      realName: "System Operator",
      gender: "MALE",
      age: 40,
      country: "INDIA",
      state: "MAHARASHTRA",
      region: "TRISHUL",
      area: "CORE",
      emailVerified: new Date(),
    },
  });

  const female = await prisma.user.upsert({
    where: { email: "player2@nexus.local" },
    update: {
      ...STARTING_WALLET,
      position: "PLAYER",
      role: "USER",
      gender: "FEMALE",
      realName: "Ananya Rao",
      age: 24,
      country: "INDIA",
      state: "MAHARASHTRA",
      region: "SUDARSHAN",
      area: "INNER",
      emailVerified: new Date(),
    },
    create: {
      username: "ShadowBlade2291",
      email: "player2@nexus.local",
      passwordHash: playerPassword,
      role: "USER",
      position: "PLAYER",
      ...STARTING_WALLET,
      bio: "Night ops.",
      realName: "Ananya Rao",
      gender: "FEMALE",
      age: 24,
      country: "INDIA",
      state: "MAHARASHTRA",
      region: "SUDARSHAN",
      area: "INNER",
      emailVerified: new Date(),
    },
  });

  const male = await prisma.user.upsert({
    where: { email: "player1@nexus.local" },
    update: {
      ...STARTING_WALLET,
      position: "PLAYER",
      role: "USER",
      gender: "MALE",
      realName: "Arjun Mehta",
      age: 26,
      partnerId: female.id,
      country: "INDIA",
      state: "UTTAR_PRADESH",
      region: "TRISHUL",
      area: "OUTER",
      emailVerified: new Date(),
    },
    create: {
      username: "NeonRunner1842",
      email: "player1@nexus.local",
      passwordHash: playerPassword,
      role: "USER",
      position: "PLAYER",
      ...STARTING_WALLET,
      bio: "Fresh operator.",
      realName: "Arjun Mehta",
      gender: "MALE",
      age: 26,
      partnerId: female.id,
      country: "INDIA",
      state: "UTTAR_PRADESH",
      region: "TRISHUL",
      area: "OUTER",
      emailVerified: new Date(),
    },
  });

  await prisma.user.update({ where: { id: female.id }, data: { partnerId: male.id } });

  await prisma.user.upsert({
    where: { email: "player3@nexus.local" },
    update: {
      ...STARTING_WALLET,
      position: "PLAYER",
      role: "USER",
      gender: "FEMALE",
      realName: "Priya Sen",
      age: 23,
      country: "INDIA",
      state: "WEST_BENGAL",
      region: "ASTRA",
      area: "CORE",
      emailVerified: new Date(),
    },
    create: {
      username: "GridWalker4408",
      email: "player3@nexus.local",
      passwordHash: playerPassword,
      role: "USER",
      position: "PLAYER",
      ...STARTING_WALLET,
      bio: "Walking the packets.",
      realName: "Priya Sen",
      gender: "FEMALE",
      age: 23,
      country: "INDIA",
      state: "WEST_BENGAL",
      region: "ASTRA",
      area: "CORE",
      emailVerified: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log("Admin account: admin@nexus.local (username SHIVASAHU)");
  console.log("Players: player1@nexus.local / player2@nexus.local / player3@nexus.local  password nexus1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
