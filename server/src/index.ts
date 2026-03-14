import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express from "express";
import http from "http";
import os from "os";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { PORT } from "./config";
import { GameManager } from "./managers/GameManager";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";
import { registerGameHandlers, getTimerManager } from "./handlers/gameHandlers";
import { registerAdminHandlers } from "./handlers/adminHandlers";
import { registerConnectionHandlers } from "./handlers/connectionHandlers";
import { registerKalakHandlers } from "./handlers/kalakHandlers";
import { registerGwdwHandlers } from "./handlers/gwdwHandlers";
import { loadQuestionCache } from "./services/questionGenerator";
import { loadPromptCache } from "./services/promptGenerator";

const app = express();

// Security headers (relaxed CSP for game app with inline styles/scripts)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: CORS_ORIGIN }));

// Rate limiting for API routes
app.use("/api", rateLimit({ windowMs: 60_000, max: 60 }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

const gameManager = new GameManager();
const timerManager = getTimerManager();

// Load cached questions/prompts
loadQuestionCache();
loadPromptCache();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// API endpoint to get LAN IP for QR code generation
app.get("/api/server-info", (_req, res) => {
  const lanIp = getLanIp();
  res.json({ ip: lanIp, port: PORT });
});

// Serve client build in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  registerConnectionHandlers(io, socket, gameManager);
  registerLobbyHandlers(io, socket, gameManager);
  registerGameHandlers(io, socket, gameManager);
  registerAdminHandlers(io, socket, gameManager);
  registerKalakHandlers(io, socket, gameManager, timerManager);
  registerGwdwHandlers(io, socket, gameManager, timerManager);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Kill the other process or use a different port.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, "0.0.0.0", () => {
  const lanIp = getLanIp();
  console.log(`Game server running on http://0.0.0.0:${PORT}`);
  console.log(`LAN access: http://${lanIp}:${PORT}`);
});

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  const candidates: { address: string; priority: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family !== "IPv4" || iface.internal) continue;

      const lower = name.toLowerCase();
      let priority = 0;

      // Prefer real LAN adapters over virtual ones
      if (lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("wlan")) {
        priority = 100;
      } else if (lower.includes("ethernet") || lower.includes("eth")) {
        priority = 90;
      } else if (iface.address.startsWith("192.168.") || iface.address.startsWith("10.")) {
        priority = 50;
      } else if (lower.includes("vethernet") || lower.includes("docker") || lower.includes("vmware") || lower.includes("hyper-v") || lower.includes("vbox")) {
        priority = -10;
      }

      candidates.push({ address: iface.address, priority });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0].address;
  }
  return "localhost";
}

// ── Graceful shutdown ──

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  timerManager.stopAll();
  io.close();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  // Force exit after 5s if close hangs
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Global error handlers ──

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
