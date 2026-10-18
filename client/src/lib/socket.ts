import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempts = 0;

function origin(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:3001";
  return window.location.origin;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token?: string): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io(origin(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: token ? { token } : {},
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 400,
    reconnectionDelayMax: 4000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    attempts = 0;
    socket?.emit("JOIN_WORLD");
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      scheduleReconnect();
    }
  });

  socket.on("connect_error", () => {
    scheduleReconnect();
  });

  return socket;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  attempts += 1;
  const delay = Math.min(4000, 300 * 2 ** Math.min(attempts, 5));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    socket?.connect();
  }, delay);
}

export function disconnectSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  attempts = 0;
}

export function emitWithAck<T = unknown>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }
    const timer = setTimeout(() => reject(new Error("Socket timeout")), timeoutMs);
    socket.emit(event, payload, (res: T & { error?: string }) => {
      clearTimeout(timer);
      if (res && typeof res === "object" && "error" in res && res.error) {
        reject(new Error(String(res.error)));
        return;
      }
      resolve(res);
    });
  });
}
