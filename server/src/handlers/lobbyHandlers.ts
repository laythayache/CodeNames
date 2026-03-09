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
  // Create room — for Kalak, laptop is host display (no player); for Codenames, host is a player
  socket.on("client:create-room", (data: CreateRoomPayload) => {
    const gameType = data.gameType === GameType.KALAK ? GameType.KALAK : GameType.CODENAMES;

    if (gameType === GameType.KALAK) {
      // Laptop creates room as host display — NOT a player
      const game = gameManager.createKalakRoom(socket.id);
      socket.join(game.roomCode);
      socket.emit("server:room-created", { roomCode: game.roomCode, gameType, isHostDisplay: true });
      socket.emit("server:kalak-lobby-state", game.getLobbyState());
    } else {
      // Codenames: need displayName, host IS a player
      const displayName = (data as any).displayName;
      if (!displayName?.trim()) {
        socket.emit("server:join-error", { message: "Display name is required" });
        return;
      }
      const game = gameManager.createCodenamesRoom(socket.id, displayName.trim());
      socket.join(game.roomCode);
      socket.emit("server:room-created", { roomCode: game.roomCode, gameType });
      io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
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

    // Allow mid-game join for Kalak
    if (game.gameType === GameType.KALAK) {
      const kg = game as KalakGame;

      if (game.phase !== GamePhase.LOBBY && game.phase !== GamePhase.PLAYING) {
        socket.emit("server:join-error", { message: "Game has ended" });
        return;
      }

      kg.addPlayer(socket.id, displayName.trim(), false, avatar);
      socket.join(game.roomCode);

      // Create JWT token for persistent session
      const { token } = createToken(displayName.trim(), roomCode.toUpperCase(), avatar);
      socket.emit("server:room-joined", {
        roomCode: game.roomCode,
        gameType: GameType.KALAK,
        token,
      });

      if (game.phase === GamePhase.LOBBY) {
        io.to(game.roomCode).emit("server:kalak-lobby-state", kg.getLobbyState());
      } else {
        // Mid-game join: send current game state to new player
        const player = kg.findPlayerBySocketId(socket.id)!;
        socket.emit("server:kalak-game-state", kg.getGameStatePayload(player));
        // Update host display with new player
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
      socket.emit("server:room-joined", {
        roomCode: game.roomCode,
        gameType: GameType.CODENAMES,
      });
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
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const cg = game as Game;
    cg.timerEnabled = data.timerEnabled;
    cg.timerDuration = data.timerDuration;
    io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
  });

  socket.on("client:start-game", () => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const cg = game as Game;
    const check = cg.canStart();
    if (!check.ok) {
      socket.emit("server:join-error", { message: check.reason! });
      return;
    }

    cg.start();

    for (const p of game.players) {
      const sock = io.sockets.sockets.get(p.id);
      if (sock) {
        sock.emit("server:game-state", cg.getGameStatePayload(p));
      }
    }
  });
}
