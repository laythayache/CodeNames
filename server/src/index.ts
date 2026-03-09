import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { PORT } from "./config";
import { GameManager } from "./managers/GameManager";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";
import { registerGameHandlers } from "./handlers/gameHandlers";
import { registerAdminHandlers } from "./handlers/adminHandlers";
import { registerConnectionHandlers } from "./handlers/connectionHandlers";

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

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  registerConnectionHandlers(io, socket, gameManager);
  registerLobbyHandlers(io, socket, gameManager);
  registerGameHandlers(io, socket, gameManager);
  registerAdminHandlers(io, socket, gameManager);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Codenames server running on http://0.0.0.0:${PORT}`);
});
