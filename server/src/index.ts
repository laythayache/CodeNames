import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express from "express";
import http from "http";
import os from "os";
import cors from "cors";
import { Server } from "socket.io";
import { PORT } from "./config";
import { GameManager } from "./managers/GameManager";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";
import { registerGameHandlers, getTimerManager } from "./handlers/gameHandlers";
import { registerAdminHandlers } from "./handlers/adminHandlers";
import { registerConnectionHandlers } from "./handlers/connectionHandlers";
import { registerKalakHandlers } from "./handlers/kalakHandlers";
import { loadQuestionCache } from "./services/questionGenerator";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const gameManager = new GameManager();
const timerManager = getTimerManager();

// Load cached questions for Kalak
loadQuestionCache();

// API endpoint to get LAN IP for QR code generation
app.get("/api/server-info", (_req, res) => {
  const lanIp = getLanIp();
  res.json({ ip: lanIp, port: PORT });
});

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  registerConnectionHandlers(io, socket, gameManager);
  registerLobbyHandlers(io, socket, gameManager);
  registerGameHandlers(io, socket, gameManager);
  registerAdminHandlers(io, socket, gameManager);
  registerKalakHandlers(io, socket, gameManager, timerManager);
});

server.listen(PORT, "0.0.0.0", () => {
  const lanIp = getLanIp();
  console.log(`Game server running on http://0.0.0.0:${PORT}`);
  console.log(`LAN access: http://${lanIp}:${PORT}`);
});

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
