import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import {
  CreateRoomPayload, JoinRoomPayload, PickTeamPayload,
  UpdateSettingsPayload, GamePhase, GameType,
} from "shared/types";
import { Game } from "../models/Game";

export function registerLobbyHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  socket.on("client:create-room", (data: CreateRoomPayload) => {
    const { displayName } = data;
    if (!displayName?.trim()) {
      socket.emit("server:join-error", { message: "Display name is required" });
      return;
    }

    const gameType = data.gameType === GameType.KALAK ? GameType.KALAK : GameType.CODENAMES;
    const game = gameManager.createGame(socket.id, displayName.trim(), gameType);
    socket.join(game.roomCode);
    socket.emit("server:room-created", { roomCode: game.roomCode, gameType });

    if (gameType === GameType.KALAK) {
      io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
    } else {
      io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
    }
  });

  socket.on("client:join-room", (data: JoinRoomPayload) => {
    const { roomCode, displayName } = data;
    if (!displayName?.trim()) {
      socket.emit("server:join-error", { message: "Display name is required" });
      return;
    }

    const game = gameManager.getGame(roomCode);
    if (!game) {
      socket.emit("server:join-error", { message: "Room not found" });
      return;
    }

    if (game.phase !== GamePhase.LOBBY) {
      socket.emit("server:join-error", { message: "Game already in progress" });
      return;
    }

    if (game.isNameTaken(displayName.trim())) {
      socket.emit("server:join-error", { message: "Name already taken in this room" });
      return;
    }

    game.addPlayer(socket.id, displayName.trim(), false);
    socket.join(game.roomCode);
    socket.emit("server:room-created", { roomCode: game.roomCode, gameType: game.gameType });

    if (game.gameType === GameType.KALAK) {
      io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
    } else {
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

    // Send role-filtered state to each player
    for (const p of game.players) {
      const sock = io.sockets.sockets.get(p.id);
      if (sock) {
        sock.emit("server:game-state", cg.getGameStatePayload(p));
      }
    }
  });
}
