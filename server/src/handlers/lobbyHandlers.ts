import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import {
  CreateRoomPayload, JoinRoomPayload, PickTeamPayload,
  UpdateSettingsPayload, GamePhase, GameType,
} from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import { createToken } from "../services/auth";

export function registerLobbyHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  // Create room — both Kalak and Codenames use host display pattern (laptop is NOT a player)
  socket.on("client:create-room", (data: CreateRoomPayload) => {
    const gameType = data.gameType === GameType.KALAK ? GameType.KALAK : GameType.CODENAMES;

    if (gameType === GameType.KALAK) {
      const game = gameManager.createKalakRoom(socket.id);
      socket.join(game.roomCode);
      socket.emit("server:room-created", { roomCode: game.roomCode, gameType, isHostDisplay: true });
      socket.emit("server:kalak-lobby-state", game.getLobbyState());
    } else {
      // Codenames: laptop is host display — NOT a player
      const game = gameManager.createCodenamesRoom(socket.id);
      socket.join(game.roomCode);
      socket.emit("server:room-created", { roomCode: game.roomCode, gameType, isHostDisplay: true });
      socket.emit("server:lobby-state", game.getLobbyState());
    }
  });

  // Join room — player joins with name + avatar
  socket.on("client:join-room", (data: JoinRoomPayload) => {
    const { roomCode, displayName, avatar } = data;
    if (!displayName?.trim()) {
      socket.emit("server:join-error", { message: "Display name is required" });
      return;
    }

    const game = gameManager.getGame(roomCode);
    if (!game) {
      socket.emit("server:join-error", { message: "Room not found" });
      return;
    }

    if (game.isNameTaken(displayName.trim())) {
      socket.emit("server:join-error", { message: "Name already taken in this room" });
      return;
    }

    if (game.gameType === GameType.KALAK) {
      const kg = game as KalakGame;

      if (game.phase !== GamePhase.LOBBY && game.phase !== GamePhase.PLAYING) {
        socket.emit("server:join-error", { message: "Game has ended" });
        return;
      }

      kg.addPlayer(socket.id, displayName.trim(), false, avatar);
      socket.join(game.roomCode);

      const { token } = createToken(displayName.trim(), roomCode.toUpperCase(), avatar);
      socket.emit("server:room-joined", {
        roomCode: game.roomCode,
        gameType: GameType.KALAK,
        token,
      });

      if (game.phase === GamePhase.LOBBY) {
        io.to(game.roomCode).emit("server:kalak-lobby-state", kg.getLobbyState());
      } else {
        const player = kg.findPlayerBySocketId(socket.id)!;
        socket.emit("server:kalak-game-state", kg.getGameStatePayload(player));
        if (kg.hostDisplaySocketId) {
          const hostSock = io.sockets.sockets.get(kg.hostDisplaySocketId);
          if (hostSock) hostSock.emit("server:kalak-host-display", kg.getHostDisplayPayload());
        }
      }
    } else {
      // Codenames: only join in LOBBY
      if (game.phase !== GamePhase.LOBBY) {
        socket.emit("server:join-error", { message: "Game already in progress" });
        return;
      }

      game.addPlayer(socket.id, displayName.trim(), false);
      socket.join(game.roomCode);

      const { token } = createToken(displayName.trim(), roomCode.toUpperCase(), avatar);
      socket.emit("server:room-joined", {
        roomCode: game.roomCode,
        gameType: GameType.CODENAMES,
        token,
      });

      // Broadcast lobby state to all players + host display
      io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
    }
  });

  socket.on("client:pick-team", (data: PickTeamPayload) => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const success = (game as Game).pickTeam(socket.id, data.team, data.role);
    if (!success) {
      socket.emit("server:join-error", { message: "That spymaster slot is taken" });
      return;
    }

    io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
  });

  socket.on("client:update-settings", (data: UpdateSettingsPayload) => {
    // Only host display can update settings
    const game = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const cg = game as Game;
    cg.timerEnabled = data.timerEnabled;
    cg.timerDuration = data.timerDuration;
    io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
  });

  socket.on("client:start-game", () => {
    // Only host display can start
    const game = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const cg = game as Game;
    const check = cg.canStart();
    if (!check.ok) {
      socket.emit("server:join-error", { message: check.reason! });
      return;
    }

    cg.start();

    // Send personalized game state to each player
    for (const p of game.players) {
      const sock = io.sockets.sockets.get(p.id);
      if (sock) {
        sock.emit("server:game-state", cg.getGameStatePayload(p));
      }
    }

    // Send host display payload
    if (cg.hostDisplaySocketId) {
      const hostSock = io.sockets.sockets.get(cg.hostDisplaySocketId);
      if (hostSock) hostSock.emit("server:codenames-host-display", cg.getHostDisplayPayload());
    }
  });
}
