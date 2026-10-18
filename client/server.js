const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const httpProxy = require("http-proxy");

const dev = process.env.NODE_ENV !== "production";
const dir = __dirname;
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const nextPort = Number(process.env.NEXT_INTERNAL_PORT ?? 3100);
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";

const proxy = httpProxy.createProxyServer({
  target: backend,
  ws: true,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 25000,
  timeout: 25000,
});

const nextProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${nextPort}`,
  ws: false,
  proxyTimeout: 25000,
  timeout: 25000,
});

function shouldProxy(url) {
  return url.startsWith("/api") || url.startsWith("/socket.io");
}

function applyEdgeHeaders(res) {
  if (!res || typeof res.setHeader !== "function") return;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
}

function sendProxyFail(req, res, code) {
  if (!res || res.headersSent || typeof res.writeHead !== "function") return;
  applyEdgeHeaders(res);
  const url = req.url || "/";
  const accept = String(req.headers.accept || "");
  const wantsHtml = accept.includes("text/html") && !url.startsWith("/api") && !url.startsWith("/socket.io");
  if (wantsHtml) {
    res.writeHead(302, { Location: `/${code}` });
    res.end();
    return;
  }
  const error = code === 504 ? "Gateway timeout" : "Upstream unavailable";
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error }));
}

proxy.on("error", (err, req, res) => {
  console.error("[proxy]", err.message);
  const timedOut = err && (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT");
  sendProxyFail(req, res, timedOut ? 504 : 502);
});

nextProxy.on("error", (err, req, res) => {
  console.error("[next-proxy]", err.message);
  sendProxyFail(req, res, 502);
});

let nextHandler = null;

async function prepareNext() {
  if (dev) {
    const next = require("next");
    const app = next({ dev: true, hostname: "127.0.0.1", port: nextPort });
    nextHandler = app.getRequestHandler();
    await app.prepare();
    return;
  }
  process.env.NODE_ENV = "production";
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(require(path.join(dir, "next-config.json")));
  const { startServer } = require("next/dist/server/lib/start-server");
  await startServer({
    dir,
    isDev: false,
    config: JSON.parse(process.env.__NEXT_PRIVATE_STANDALONE_CONFIG),
    hostname: "127.0.0.1",
    port: nextPort,
    allowRetry: false,
  });
}

prepareNext().then(() => {
  const server = createServer((req, res) => {
    applyEdgeHeaders(res);
    const url = req.url || "/";
    if (url.length > 2048) {
      res.writeHead(414, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "URI too long" }));
      return;
    }
    if (req.method === "TRACE" || req.method === "TRACK") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    if (shouldProxy(url)) {
      proxy.web(req, res);
      return;
    }
    if (dev) {
      nextHandler(req, res, parse(url, true));
      return;
    }
    nextProxy.web(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "/";
    if (url.startsWith("/socket.io")) {
      proxy.ws(req, socket, head);
      return;
    }
    socket.destroy();
  });

  server.timeout = 30000;
  server.headersTimeout = 33000;
  server.requestTimeout = 30000;
  server.listen(port, hostname, () => {
    console.log(`[nexus-web] listening on http://${hostname}:${port} -> next :${nextPort}, api ${backend}`);
  });
}).catch((err) => {
  console.error("[nexus-web] failed to start", err);
  process.exit(1);
});
