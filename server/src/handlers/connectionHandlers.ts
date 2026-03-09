import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { GamePhase, GameType, Player } from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import type { BaseGame } from "../models/BaseGame";
import { verifyToken } from "../services/auth";
import { ABANDONMENT_TIMEOUT } from "../config";

const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

export function registerConnectionHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  const auth = socket.handshake.auth as {
    displayName?: string;
    roomCode?: string;
    token?: string;
  };

  // Try JWT-based reconnection first
  if (auth.token) {
    const payload = verifyToken(auth.token);
    if (payload) {
      const game = gameManager.getGame(payload.roomCode);
      if (game) {
        const player = game.findPlayerByName(payload.displayName);
        if (player && !player.isConnected) {
          reconnectPlayer(io, socket, game, player);
          return;
        }
      }
    }
  }

  // Fall back to displayName + roomCode reconnection
  if (auth.displayName && auth.roomCode) {
    const game = gameManager.getGame(auth.roomCode);
    if (game) {
      const player = game.findPlayerByName(auth.displayName);
      if (player && !player.isConnected) {
        reconnectPlayer(io, socket, game, player);
        return;
      }
    }
  }

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    // Check if this is a host display disconnecting (either game type)
    if (gameManager.isHostDisplay(socket.id)) {
      const hostGame = gameManager.findGameByHostDisplaySocket(socket.id);
      if (hostGame) {
        console.log(`Host display disconnected for room ${hostGame.roomCode}`);
        // Don't remove the game — host display can reconnect
      }
      return;
    }

    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player) return;

    player.isConnected = false;

    // For Kalak, don't clear submitted answers on disconnect
    if (game.gameType !== GameType.KALAK) {
      game.removeVotesForPlayer(player.displayName);
    }

    // Notify room
    if (game.gameType === GameType.KALAK) {
      const kg = game as KalakGame;
      if (game.phase === GamePhase.LOBBY) {
        io.to(game.roomCode).emit("server:kalak-lobby-state", kg.getLobbyState());
      } else {
        broadcastKalakState(io, kg);
      }
    } else {
      const cg = game as Game;
      if (game.phase === GamePhase.LOBBY) {
        io.to(game.roomCode).emit("server:lobby-state", cg.getLobbyState());
      } else {
        game.removeVotesForPlayer(player.displayName);
        io.to(game.roomCode).emit("server:votes-updated", {
          votes: cg.getVotesPayload(),
        });
        broadcastCodenamesState(io, cg);
      }
    }

    // Abandonment timer
    const timerKey = `${game.roomCode}:${player.displayName}`;
    disconnectTimers.set(
      timerKey,
      setTimeout(() => {
        disconnectTimers.delete(timerKey);
        console.log(`Player abandoned: ${player.displayName} from room ${game.roomCode}`);
      }, ABANDONMENT_TIMEOUT)
    );

    // Clean up empty games
    const connected = game.players.filter((p) => p.isConnected);
    if (connected.length === 0) {
      setTimeout(() => {
        const stillEmpty = game.players.every((p) => !p.isConnected);
        if (stillEmpty) {
          gameManager.removeGame(game.roomCode);
        }
      }, ABANDONMENT_TIMEOUT);
    }
  });
}

function reconnectPlayer(io: Server, socket: Socket, game: BaseGame, player: Player): void {
  player.id = socket.id;
  player.isConnected = true;
  socket.join(game.roomCode);

  // Cancel abandonment timer
  const timerKey = `${game.roomCode}:${player.displayName}`;
  const timer = disconnectTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(timerKey);
  }

  console.log(`Reconnected: ${player.displayName} to room ${game.roomCode}`);

  if (game.gameType === GameType.KALAK) {
    const kg = game as KalakGame;
    socket.emit("server:room-joined", { roomCode: game.roomCode, gameType: GameType.KALAK });
    if (game.phase === GamePhase.LOBBY) {
      io.to(game.roomCode).emit("server:kalak-lobby-state", kg.getLobbyState());
    } else {
      socket.emit("server:kalak-game-state", kg.getGameStatePayload(player));
    }
  } else {
    const cg = game as Game;
    socket.emit("server:room-joined", { roomCode: game.roomCode, gameType: GameType.CODENAMES });
    if (game.phase === GamePhase.LOBBY) {
      io.to(game.roomCode).emit("server:lobby-state", cg.getLobbyState());
    } else {
      socket.emit("server:game-state", cg.getGameStatePayload(player));
    }
  }
}

function broadcastKalakState(io: Server, game: KalakGame): void {
  for (const p of game.players) {
    if (!p.isConnected) continue;
    const sock = io.sockets.sockets.get(p.id);
    if (sock) sock.emit("server:kalak-game-state", game.getGameStatePayload(p));
  }
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) hostSock.emit("server:kalak-host-display", game.getHostDisplayPayload());
  }
}

function broadcastCodenamesState(io: Server, game: Game): void {
  for (const p of game.players) {
    if (!p.isConnected) continue;
    const sock = io.sockets.sockets.get(p.id);
    if (sock) sock.emit("server:game-state", game.getGameStatePayload(p));
  }
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) hostSock.emit("server:codenames-host-display", game.getHostDisplayPayload());
  }
}
