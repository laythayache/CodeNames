import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import { KalakGame } from "../models/KalakGame";
import { GamePhase, GameType, KalakRoundPhase, KalakSubmitAnswerPayload, KalakUpdateSettingsPayload, KalakVotePayload } from "shared/types";
import { generateQuestion, preloadCategories } from "../services/questionGenerator";

const ANSWERING_TIME = 60;
const VOTING_TIME = 30;
const QUESTION_DISPLAY_TIME = 3;
const REVEAL_DISPLAY_TIME = 6;

function getKalakGame(gameManager: GameManager, socketId: string): KalakGame | null {
  const game = gameManager.findGameBySocketId(socketId);
  if (!game || game.gameType !== GameType.KALAK) return null;
  return game as KalakGame;
}

function broadcastKalakState(io: Server, game: KalakGame): void {
  for (const p of game.players) {
    const sock = io.sockets.sockets.get(p.id);
    if (sock) {
      sock.emit("server:kalak-game-state", game.getGameStatePayload(p));
    }
  }
}

async function startNextRound(
  io: Server,
  game: KalakGame,
  timerManager: TimerManager
): Promise<void> {
  // Generate question (uses preloaded cache first)
  const { question, answer } = await generateQuestion(
    game.language,
    game.categories,
    game.usedQuestions,
    game.freeMode
  );

  game.setQuestion(question, answer);
  broadcastKalakState(io, game);

  // Brief pause to display question, then open answering
  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    game.startAnswering();
    broadcastKalakState(io, game);

    // Start answering timer
    timerManager.start(io, game.roomCode, ANSWERING_TIME, () => {
      onAnsweringTimeout(io, game, timerManager);
    });
  }, QUESTION_DISPLAY_TIME * 1000);
}

function onAnsweringTimeout(io: Server, game: KalakGame, timerManager: TimerManager): void {
  if (game.phase !== GamePhase.PLAYING || game.roundPhase !== KalakRoundPhase.ANSWERING) return;
  startVotingPhase(io, game, timerManager);
}

function startVotingPhase(io: Server, game: KalakGame, timerManager: TimerManager): void {
  game.buildVotingOptions();
  broadcastKalakState(io, game);

  timerManager.start(io, game.roomCode, VOTING_TIME, () => {
    onVotingTimeout(io, game, timerManager);
  });
}

function onVotingTimeout(io: Server, game: KalakGame, timerManager: TimerManager): void {
  if (game.phase !== GamePhase.PLAYING || game.roundPhase !== KalakRoundPhase.VOTING) return;
  resolveAndAdvance(io, game, timerManager);
}

function resolveAndAdvance(io: Server, game: KalakGame, timerManager: TimerManager): void {
  timerManager.stop(game.roomCode);

  const result = game.resolveRound();
  io.to(game.roomCode).emit("server:kalak-round-result", result);
  broadcastKalakState(io, game);

  // After reveal period, advance
  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;

    const hasMore = game.advanceRound();
    if (!hasMore) {
      // Game over
      io.to(game.roomCode).emit("server:kalak-game-over", game.getGameOverPayload());
      broadcastKalakState(io, game);
    } else {
      startNextRound(io, game, timerManager);
    }
  }, REVEAL_DISPLAY_TIME * 1000);
}

export function registerKalakHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  timerManager: TimerManager
): void {
  socket.on("client:kalak-update-settings", (data: KalakUpdateSettingsPayload) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;
    if (game.phase !== GamePhase.LOBBY) return;

    game.updateSettings(data.language, data.categories, data.totalRounds, data.freeMode);
    io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
  });

  socket.on("client:kalak-add-category", (data: { category: string }) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;
    if (game.phase !== GamePhase.LOBBY) return;

    game.addCategory(data.category);
    io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
  });

  socket.on("client:kalak-remove-category", (data: { category: string }) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;
    if (game.phase !== GamePhase.LOBBY) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    game.removeCategory(data.category);
    io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
  });

  socket.on("client:kalak-start-game", async () => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    const check = game.canStart();
    if (!check.ok) {
      socket.emit("server:error", { message: check.reason });
      return;
    }

    game.start();

    // Preload questions for all categories before starting rounds
    await preloadCategories(game.language, game.categories, game.freeMode);

    startNextRound(io, game, timerManager);
  });

  socket.on("client:kalak-submit-answer", (data: KalakSubmitAnswerPayload) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.submitAnswer(socket.id, data.answer);
    if (!success) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (player) {
      io.to(game.roomCode).emit("server:kalak-player-answered", {
        displayName: player.displayName,
      });
    }

    // If all answered, move to voting
    if (game.allAnswered()) {
      timerManager.stop(game.roomCode);
      startVotingPhase(io, game, timerManager);
    }
  });

  socket.on("client:kalak-vote", (data: KalakVotePayload) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.vote(socket.id, data.answerId);
    if (!success) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (player) {
      io.to(game.roomCode).emit("server:kalak-player-voted", {
        displayName: player.displayName,
      });
    }

    // If all voted, resolve
    if (game.allVoted()) {
      resolveAndAdvance(io, game, timerManager);
    }
  });

  socket.on("client:kalak-rematch", async () => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (!player?.isHost) return;

    game.rematch();

    // Preload again for new game
    await preloadCategories(game.language, game.categories, game.freeMode);

    startNextRound(io, game, timerManager);
  });
}
