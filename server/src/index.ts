import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cookie from "cookie";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { redisPub, redisSub } from "./lib/redis";
import { verifyToken } from "./lib/jwt";
import { assertSession } from "./lib/session";
import { requireAdmin, requireAuth, type AuthedRequest } from "./middleware/auth";
import { applySecurityHeaders, jsonErrorHandler, maintenanceGate, rejectUnsafeMethods } from "./middleware/security";
import * as authController from "./controllers/authController";
import { createEconomyController } from "./controllers/economyController";
import { createAdminController } from "./controllers/adminController";
import { createFriendController } from "./controllers/friendController";
import { createOrgController } from "./controllers/orgController";
import { createTaskController } from "./controllers/taskController";
import { createUpgradeController } from "./controllers/upgradeController";
import * as chatController from "./controllers/chatController";
import { registerChatHandlers } from "./socket/chatHandler";
import { startMessageJanitor } from "./lib/messages";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(applySecurityHeaders);
app.use(rejectUnsafeMethods);
app.use(maintenanceGate);
app.use(
  cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb", strict: true, type: "application/json" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gaiya-system", time: new Date().toISOString() });
});

app.post("/api/auth/register", (req, res) => void authController.register(req, res));
app.post("/api/auth/login", (req, res) => void authController.login(req, res));
app.post("/api/auth/logout", (req, res) => void authController.logout(req, res));
app.post("/api/auth/verify", (req, res) => void authController.verifyOtp(req, res));
app.get("/api/auth/otp-status", (req, res) => void authController.otpStatus(req as AuthedRequest, res));
app.post("/api/auth/forgot", (req, res) => void authController.forgotPassword(req, res));
app.post("/api/auth/reset", (req, res) => void authController.resetPassword(req, res));
app.post("/api/privacy/delete-request", (req, res) => void authController.requestDeletion(req, res));
app.get("/api/auth/me", requireAuth, (req, res) => void authController.me(req as AuthedRequest, res));
app.get("/api/auth/options", (req, res) => void authController.options(req as AuthedRequest, res));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
    credentials: true,
  },
  pingInterval: 20000,
  pingTimeout: 20000,
});

io.adapter(createAdapter(redisPub, redisSub));

io.use((socket, next) => {
  void (async () => {
    try {
      const header = socket.handshake.headers.cookie;
      const parsed = header ? cookie.parse(header) : {};
      const fromCookie = parsed[config.cookieName];
      const fromAuth = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : null;
      const fromQuery = typeof socket.handshake.query?.token === "string" ? socket.handshake.query.token : null;
      const token = fromCookie || fromAuth || fromQuery;
      if (!token) {
        next(new Error("Authentication required"));
        return;
      }
      const payload = verifyToken(token);
      const session = await assertSession(payload);
      if (!session) {
        next(new Error("Invalid token"));
        return;
      }
      socket.data.auth = session;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  })();
});

io.on("connection", (socket) => {
  registerChatHandlers(io, socket);
});

const economy = createEconomyController(io);
const admin = createAdminController(io);
const accounts = authController.createAccountController(io);
app.post("/api/account/deactivate", requireAuth, (req, res) => void accounts.deactivateSelf(req as AuthedRequest, res));
app.post("/api/account/delete", requireAuth, (req, res) => void accounts.deleteSelf(req as AuthedRequest, res));
app.post("/api/account/intro-seen", requireAuth, (req, res) => void accounts.markIntroSeen(req as AuthedRequest, res));
const friends = createFriendController(io);
const orgs = createOrgController(io);
const tasks = createTaskController();
const upgrades = createUpgradeController();
app.post("/api/economy/transfer", requireAuth, (req, res) => void economy.transferCoins(req as AuthedRequest, res));
app.get("/api/economy/currencies", requireAuth, (req, res) => void economy.listCurrencies(req as AuthedRequest, res));
app.get("/api/titles/mine", requireAuth, (req, res) => void economy.listMyTitles(req as AuthedRequest, res));
app.post("/api/titles/equip", requireAuth, (req, res) => void economy.equipTitle(req as AuthedRequest, res));
app.post("/api/titles/deeds", requireAuth, (req, res) => void economy.submitDeed(req as AuthedRequest, res));
app.get("/api/titles/deeds", requireAuth, (req, res) => void economy.myDeeds(req as AuthedRequest, res));
app.patch("/api/profile", requireAuth, (req, res) => void economy.updateProfile(req as AuthedRequest, res));
app.get("/api/users/:id", requireAuth, (req, res) => void economy.getUser(req as AuthedRequest, res));
app.get("/api/quarters", requireAuth, (req, res) => void economy.quarters(req as AuthedRequest, res));
app.get("/api/friends", requireAuth, (req, res) => void friends.list(req as AuthedRequest, res));
app.post("/api/friends/request", requireAuth, (req, res) => void friends.send(req as AuthedRequest, res));
app.post("/api/friends/respond", requireAuth, (req, res) => void friends.respond(req as AuthedRequest, res));
app.get("/api/orgs", requireAuth, (req, res) => void orgs.mine(req as AuthedRequest, res));
app.post("/api/orgs", requireAuth, (req, res) => void orgs.create(req as AuthedRequest, res));
app.post("/api/orgs/join", requireAuth, (req, res) => void orgs.joinParty(req as AuthedRequest, res));
app.post("/api/orgs/leave", requireAuth, (req, res) => void orgs.leaveParty(req as AuthedRequest, res));
app.post("/api/orgs/attach", requireAuth, (req, res) => void orgs.attach(req as AuthedRequest, res));
app.get("/api/orgs/:id", requireAuth, (req, res) => void orgs.detail(req as AuthedRequest, res));
app.get("/api/tasks", requireAuth, (req, res) => void tasks.catalog(req as AuthedRequest, res));
app.post("/api/tasks/select", requireAuth, (req, res) => void tasks.select(req as AuthedRequest, res));
app.post("/api/tasks/report", requireAuth, (req, res) => void tasks.report(req as AuthedRequest, res));
app.get("/api/upgrades", requireAuth, (req, res) => void upgrades.mine(req as AuthedRequest, res));
app.post("/api/upgrades", requireAuth, (req, res) => void upgrades.submit(req as AuthedRequest, res));
app.get("/api/admin/users", requireAdmin, (req, res) => void admin.listUsers(req as AuthedRequest, res));
app.post("/api/admin/position", requireAdmin, (req, res) => void admin.setPosition(req as AuthedRequest, res));
app.post("/api/admin/grant-currency", requireAdmin, (req, res) => void admin.grantCurrency(req as AuthedRequest, res));
app.get("/api/admin/deeds", requireAdmin, (req, res) => void admin.listDeeds(req as AuthedRequest, res));
app.post("/api/admin/titles/grant", requireAdmin, (req, res) => void admin.createAndGrantTitle(req as AuthedRequest, res));
app.post("/api/admin/deeds/review", requireAdmin, (req, res) => void admin.reviewDeed(req as AuthedRequest, res));
app.get("/api/admin/locations", requireAdmin, (req, res) => void admin.locationTree(req as AuthedRequest, res));
app.get("/api/admin/upgrades", requireAdmin, (req, res) => void admin.listUpgradeRequests(req as AuthedRequest, res));
app.post("/api/admin/upgrades/review", requireAdmin, (req, res) => void admin.reviewUpgrade(req as AuthedRequest, res));
app.get("/api/admin/tasks", requireAdmin, (req, res) => void admin.listTaskReports(req as AuthedRequest, res));
app.post("/api/admin/tasks/review", requireAdmin, (req, res) => void admin.reviewTask(req as AuthedRequest, res));
app.post("/api/admin/users/delete", requireAdmin, (req, res) => void admin.deleteUser(req as AuthedRequest, res));
app.post("/api/admin/users/status", requireAdmin, (req, res) => void admin.setStatus(req as AuthedRequest, res));
app.get("/api/chat/world", requireAuth, (req, res) => void chatController.worldHistory(req as AuthedRequest, res));
app.get("/api/chat/dm/:userId", requireAuth, (req, res) => void chatController.dmHistory(req as AuthedRequest, res));
app.get("/api/chat/conversations", requireAuth, (req, res) => void chatController.conversations(req as AuthedRequest, res));

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use(jsonErrorHandler);

async function start() {
  await prisma.$connect();
  httpServer.timeout = 30000;
  httpServer.headersTimeout = 33000;
  httpServer.requestTimeout = 30000;
  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`[gaiya] API + WS listening on :${config.port}`);
  });
  startMessageJanitor(io);
}

start().catch((err) => {
  console.error("[gaiya] failed to start", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  io.close();
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
});
