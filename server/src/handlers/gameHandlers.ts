import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import { Game } from "../models/Game";
import {
  ConfirmGuessPayload, GamePhase, GameType, GiveCluePayload, Role, TurnPhase, VoteCardPayload,
} from "shared/types";

const timerManager = new TimerManager();

function getCodenamesGame(gameManager: GameManager, socketId: string): Game | null {
  const game = gameManager.findGameBySocketId(socketId);
  if (!game || game.gameType !== GameType.CODENAMES) return null;
  return game as Game;
}

function broadcastGameState(io: Server, gameManager: GameManager, roomCode: string): void {
  const game = gameManager.getCodenamesGame(roomCode);
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
    const game = getCodenamesGame(gameManager, socket.id);
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
    const game = getCodenamesGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.vote(socket.id, data.position);
    if (!success) return;

    io.to(game.roomCode).emit("server:votes-updated", {
      votes: game.getVotesPayload(),
    });
  });

  socket.on("client:confirm-guess", (data: ConfirmGuessPayload) => {
    const game = getCodenamesGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;
    // Must be in guessing phase
    if (game.turnPhase !== TurnPhase.GUESSING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    // In normal mode, only operatives can confirm. In 1v1, spymaster can.
    const isOneVOne = game.getTeamOperatives(game.currentTurn).length === 0;
    if (player.role !== Role.OPERATIVE && !isOneVOne) return;

    // Verify majority
    const majorityPos = game.getMajorityPosition();
    if (majorityPos === null || majorityPos !== data.position) return;

    const result = game.revealCard(data.position);

    // Broadcast updated votes (cleared after reveal)
    io.to(game.roomCode).emit("server:votes-updated", {
      votes: game.getVotesPayload(),
    });

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
    const game = getCodenamesGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;
    // Must be in guessing phase
    if (game.turnPhase !== TurnPhase.GUESSING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    // In normal mode, only operatives can pass. In 1v1, spymaster can.
    const isOneVOne = game.getTeamOperatives(game.currentTurn).length === 0;
    if (player.role !== Role.OPERATIVE && !isOneVOne) return;

    timerManager.stop(game.roomCode);
    game.passTurn();
    broadcastGameState(io, gameManager, game.roomCode);
  });

  socket.on("client:rematch", () => {
    const game = getCodenamesGame(gameManager, socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    game.rematch();
    broadcastGameState(io, gameManager, game.roomCode);
  });
}
