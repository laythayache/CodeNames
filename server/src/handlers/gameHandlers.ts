import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import { Game } from "../models/Game";
import {
  ConfirmGuessPayload, GamePhase, GameType, GiveCluePayload, Role, TurnPhase, VoteCardPayload,
} from "shared/types";

const timerManager = new TimerManager();

function getCodenamesGame(gameManager: GameManager, socketId: string): Game | null {
  // Check player socket first
  const game = gameManager.findGameBySocketId(socketId);
  if (game && game.gameType === GameType.CODENAMES) return game as Game;

  // Check host display socket
  const hostGame = gameManager.findGameByHostDisplaySocket(socketId);
  if (hostGame && hostGame.gameType === GameType.CODENAMES) return hostGame as Game;

  return null;
}

function broadcastGameState(io: Server, game: Game): void {
  // Send personalized state to each player
  for (const p of game.players) {
    const sock = io.sockets.sockets.get(p.id);
    if (sock) {
      sock.emit("server:game-state", game.getGameStatePayload(p));
    }
  }

  // Send host display payload
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) hostSock.emit("server:codenames-host-display", game.getHostDisplayPayload());
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

    if (game.timerEnabled) {
      timerManager.start(io, game.roomCode, game.timerDuration, () => {
        if (game.phase !== GamePhase.PLAYING) return;
        game.passTurn();
        broadcastGameState(io, game);
      });
    }

    broadcastGameState(io, game);
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
    if (game.turnPhase !== TurnPhase.GUESSING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    const isOneVOne = game.getTeamOperatives(game.currentTurn).length === 0;
    if (player.role !== Role.OPERATIVE && !isOneVOne) return;

    const majorityPos = game.getMajorityPosition();
    if (majorityPos === null || majorityPos !== data.position) return;

    const result = game.revealCard(data.position);

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

    broadcastGameState(io, game);
  });

  socket.on("client:pass-turn", () => {
    const game = getCodenamesGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== TurnPhase.GUESSING) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player || player.team !== game.currentTurn) return;

    const isOneVOne = game.getTeamOperatives(game.currentTurn).length === 0;
    if (player.role !== Role.OPERATIVE && !isOneVOne) return;

    timerManager.stop(game.roomCode);
    game.passTurn();
    broadcastGameState(io, game);
  });

  socket.on("client:rematch", () => {
    // Only host display can rematch
    const game = gameManager.findGameByHostDisplaySocket(socket.id);
    if (!game || game.gameType !== GameType.CODENAMES) return;

    const cg = game as Game;
    cg.rematch();

    // Back to lobby — broadcast lobby state to all players + host display
    io.to(game.roomCode).emit("server:lobby-state", cg.getLobbyState());
  });
}
