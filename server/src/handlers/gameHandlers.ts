import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import {
  ConfirmGuessPayload, GamePhase, GiveCluePayload, VoteCardPayload,
} from "shared/types";

const timerManager = new TimerManager();

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

export function getTimerManager(): TimerManager {
  return timerManager;
}

export function registerGameHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  socket.on("client:give-clue", (data: GiveCluePayload) => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.giveClue(socket.id, data.word, data.number);
    if (!success) return;

    // Start timer if enabled
    if (game.timerEnabled) {
      timerManager.start(io, game.roomCode, game.timerDuration, () => {
        game.passTurn();
        broadcastGameState(io, gameManager, game.roomCode);
      });
    }

    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:vote-card", (data: VoteCardPayload) => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.vote(socket.id, data.position);
    if (!success) return;

    io.to(game.roomCode).emit("server:votes-updated", {
      votes: game.getVotesPayload(),
    });
  });

  socket.on("client:confirm-guess", (data: ConfirmGuessPayload) => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    // Verify majority
    const majorityPos = game.getMajorityPosition();
    if (majorityPos === null || majorityPos !== data.position) return;

    const result = game.revealCard(data.position);

    if (result.gameOver) {
      timerManager.stop(game.roomCode);
      io.to(game.roomCode).emit("server:game-over", {
        winner: result.winner,
        reason: result.reason,
        board: game.board,
        stats: game.getStats(),
      });
    }

    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:pass-turn", () => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    timerManager.stop(game.roomCode);
    game.passTurn();

    // Start timer for next turn's clue phase if enabled
    if (game.timerEnabled) {
      timerManager.start(io, game.roomCode, game.timerDuration, () => {
        game.passTurn();
        broadcastGameState(io, gameManager, game.roomCode);
      });
    }

    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:rematch", () => {
    const game = gameManager.findGameBySocketId(socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    game.rematch();
    broadcastGameState(io, gameManager, game.roomCode);
  });
}
