import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { GamePhase, GameType, KickPlayerPayload } from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import { getTimerManager } from "./gameHandlers";

function broadcastGameState(io: Server, game: Game): void {
  for (const p of game.players) {
    const sock = io.sockets.sockets.get(p.id);
    if (sock) {
      sock.emit("server:game-state", game.getGameStatePayload(p));
    }
  }
}

export function registerAdminHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  socket.on("client:admin-pause", () => {
    const baseGame = gameManager.findGameBySocketId(socket.id);
    if (!baseGame || baseGame.gameType !== GameType.CODENAMES) return;
    const game = baseGame as Game;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const timerManager = getTimerManager();

    if (game.phase === GamePhase.PLAYING) {
      game.phase = GamePhase.PAUSED;
      timerManager.pause(game.roomCode);
    } else if (game.phase === GamePhase.PAUSED) {
      game.phase = GamePhase.PLAYING;
      if (game.timerEnabled) {
        timerManager.resume(io, game.roomCode, () => {
          game.passTurn();
          broadcastGameState(io, game);
        });
      }
    }

    io.to(game.roomCode).emit("server:game-paused", { paused: game.phase === GamePhase.PAUSED });
    broadcastGameState(io, game);
  });

  socket.on("client:admin-kick", (data: KickPlayerPayload) => {
    // Check both player host and host display socket
    let baseGame = gameManager.findGameBySocketId(socket.id);
    if (!baseGame) {
      baseGame = gameManager.findGameByHostDisplaySocket(socket.id) ?? undefined;
    }
    if (!baseGame) return;

    // For Kalak, host display can kick. For Codenames, player host can kick.
    if (baseGame.gameType === GameType.KALAK) {
      if (baseGame.hostDisplaySocketId !== socket.id) return;
    } else {
      const player = baseGame.findPlayerBySocketId(socket.id);
      if (!player?.isHost) return;
    }

    const target = baseGame.findPlayerByName(data.displayName);
    if (!target || target.isHost) return;

    // Disconnect the kicked player's socket
    const targetSocket = io.sockets.sockets.get(target.id);
    if (targetSocket) {
      targetSocket.emit("server:player-kicked", { displayName: data.displayName });
      targetSocket.leave(baseGame.roomCode);
      targetSocket.disconnect(true);
    }

    baseGame.removePlayer(data.displayName);

    if (baseGame.phase === GamePhase.LOBBY) {
      if (baseGame.gameType === GameType.KALAK) {
        io.to(baseGame.roomCode).emit("server:kalak-lobby-state", (baseGame as KalakGame).getLobbyState());
      } else {
        io.to(baseGame.roomCode).emit("server:lobby-state", baseGame.getLobbyState());
      }
    } else if (baseGame.gameType === GameType.CODENAMES) {
      broadcastGameState(io, baseGame as Game);
    } else {
      const kg = baseGame as KalakGame;
      for (const p of kg.players) {
        if (p.isConnected) {
          const sock = io.sockets.sockets.get(p.id);
          if (sock) sock.emit("server:kalak-game-state", kg.getGameStatePayload(p));
        }
      }
    }
  });

  socket.on("client:admin-skip-turn", () => {
    const baseGame = gameManager.findGameBySocketId(socket.id);
    if (!baseGame || baseGame.gameType !== GameType.CODENAMES) return;
    const game = baseGame as Game;
    if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.PAUSED) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const timerManager = getTimerManager();
    timerManager.stop(game.roomCode);
    game.passTurn();
    broadcastGameState(io, game);
  });

  socket.on("client:admin-end-game", () => {
    const baseGame = gameManager.findGameBySocketId(socket.id);
    if (!baseGame) return;

    const player = baseGame.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const timerManager = getTimerManager();
    timerManager.stop(baseGame.roomCode);

    baseGame.phase = GamePhase.GAME_OVER;

    if (baseGame.gameType === GameType.CODENAMES) {
      const game = baseGame as Game;
      game.winner = null;
      io.to(game.roomCode).emit("server:game-over", {
        winner: null,
        reason: "FORCE_END",
        board: game.board,
        stats: game.getStats(),
      });
      broadcastGameState(io, game);
    } else {
      const kg = baseGame as KalakGame;
      io.to(kg.roomCode).emit("server:kalak-game-over", kg.getGameOverPayload());
      for (const p of kg.players) {
        if (p.isConnected) {
          const sock = io.sockets.sockets.get(p.id);
          if (sock) sock.emit("server:kalak-game-state", kg.getGameStatePayload(p));
        }
      }
    }
  });
}
