import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { GamePhase, GameType, KickPlayerPayload } from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import { GwdwGame } from "../models/GwdwGame";
import { getTimerManager } from "./gameHandlers";

function broadcastCodenamesState(io: Server, game: Game): void {
  for (const p of game.players) {
    if (!p.isConnected) continue;
    const sock = io.sockets.sockets.get(p.id);
    if (sock) {
      sock.emit("server:game-state", game.getGameStatePayload(p));
    }
  }
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) hostSock.emit("server:codenames-host-display", game.getHostDisplayPayload());
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

function broadcastGwdwState(io: Server, game: GwdwGame): void {
  for (const p of game.players) {
    if (!p.isConnected) continue;
    const sock = io.sockets.sockets.get(p.id);
    if (sock) sock.emit("server:gwdw-game-state", game.getGameStatePayload(p));
  }
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) hostSock.emit("server:gwdw-host-display", game.getHostDisplayPayload());
  }
}

export function registerAdminHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  socket.on("client:admin-pause", () => {
    // Only host display can pause/resume
    const baseGame = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!baseGame || baseGame.gameType !== GameType.CODENAMES) return;
    const game = baseGame as Game;

    const timerManager = getTimerManager();

    if (game.phase === GamePhase.PLAYING) {
      game.phase = GamePhase.PAUSED;
      timerManager.pause(game.roomCode);
    } else if (game.phase === GamePhase.PAUSED) {
      game.phase = GamePhase.PLAYING;
      if (game.timerEnabled) {
        timerManager.resume(io, game.roomCode, () => {
          if (game.phase !== GamePhase.PLAYING) return;
          game.passTurn();
          broadcastCodenamesState(io, game);
        });
      }
    }

    io.to(game.roomCode).emit("server:game-paused", { paused: game.phase === GamePhase.PAUSED });
    broadcastCodenamesState(io, game);
  });

  socket.on("client:admin-kick", (data: KickPlayerPayload) => {
    // Check host display socket for both game types
    let baseGame = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!baseGame) return;

    const target = baseGame.findPlayerByName(data.displayName);
    if (!target) return;

    const targetSocket = io.sockets.sockets.get(target.id);
    if (targetSocket) {
      targetSocket.emit("server:player-kicked", { displayName: data.displayName });
      targetSocket.leave(baseGame.roomCode);
      targetSocket.disconnect(true);
    }

    // Clean up votes/answers before removing player
    baseGame.removeVotesForPlayer(data.displayName);
    baseGame.removePlayer(data.displayName);

    if (baseGame.phase === GamePhase.LOBBY) {
      if (baseGame.gameType === GameType.KALAK) {
        io.to(baseGame.roomCode).emit("server:kalak-lobby-state", (baseGame as KalakGame).getLobbyState());
      } else if (baseGame.gameType === GameType.GWDW) {
        io.to(baseGame.roomCode).emit("server:gwdw-lobby-state", (baseGame as GwdwGame).getLobbyState());
      } else {
        io.to(baseGame.roomCode).emit("server:lobby-state", baseGame.getLobbyState());
      }
    } else if (baseGame.gameType === GameType.CODENAMES) {
      broadcastCodenamesState(io, baseGame as Game);
    } else if (baseGame.gameType === GameType.GWDW) {
      broadcastGwdwState(io, baseGame as GwdwGame);
    } else {
      broadcastKalakState(io, baseGame as KalakGame);
    }
  });

  socket.on("client:admin-skip-turn", () => {
    const baseGame = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!baseGame || baseGame.gameType !== GameType.CODENAMES) return;
    const game = baseGame as Game;
    if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.PAUSED) return;

    const timerManager = getTimerManager();
    timerManager.stop(game.roomCode);
    game.passTurn();
    broadcastCodenamesState(io, game);
  });

  socket.on("client:admin-end-game", () => {
    const baseGame = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!baseGame) return;

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
      broadcastCodenamesState(io, game);
    } else if (baseGame.gameType === GameType.GWDW) {
      const gw = baseGame as GwdwGame;
      io.to(gw.roomCode).emit("server:gwdw-game-over", gw.getGameOverPayload());
      broadcastGwdwState(io, gw);
    } else {
      const kg = baseGame as KalakGame;
      io.to(kg.roomCode).emit("server:kalak-game-over", kg.getGameOverPayload());
      broadcastKalakState(io, kg);
    }
  });
}
