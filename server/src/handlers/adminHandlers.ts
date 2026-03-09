import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { GamePhase, KickPlayerPayload } from "shared/types";
import { getTimerManager } from "./gameHandlers";

function broadcastGameState(io: Server, gameManager: GameManager, roomCode: string): void {
  const game = gameManager.getGame(roomCode);
  if (!game) return;

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
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

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
          broadcastGameState(io, gameManager, game.roomCode);
        });
      }
    }

    io.to(game.roomCode).emit("server:game-paused", { paused: game.phase === GamePhase.PAUSED });
    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:admin-kick", (data: KickPlayerPayload) => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const target = game.findPlayerByName(data.displayName);
    if (!target || target.isHost) return;

    // Disconnect the kicked player's socket
    const targetSocket = io.sockets.sockets.get(target.id);
    if (targetSocket) {
      targetSocket.emit("server:player-kicked", { displayName: data.displayName });
      targetSocket.leave(game.roomCode);
      targetSocket.disconnect(true);
    }

    game.removePlayer(data.displayName);

    if (game.phase === GamePhase.LOBBY) {
      io.to(game.roomCode).emit("server:lobby-state", game.getLobbyState());
    } else {
      broadcastGameState(io, gameManager, game.roomCode);
    }
  });

  socket.on("client:admin-skip-turn", () => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.PAUSED)) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const timerManager = getTimerManager();
    timerManager.stop(game.roomCode);
    game.passTurn();
    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:admin-end-game", () => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const timerManager = getTimerManager();
    timerManager.stop(game.roomCode);

    game.phase = GamePhase.GAME_OVER;
    // Winner is team with fewer remaining cards
    game.winner = game.redRemaining <= game.blueRemaining ? null : null; // no winner on force end

    io.to(game.roomCode).emit("server:game-over", {
      winner: null,
      reason: "FORCE_END",
      board: game.board,
      stats: game.getStats(),
    });

    broadcastGameState(io, gameManager, game.roomCode);
  });
}
