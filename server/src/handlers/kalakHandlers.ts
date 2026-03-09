import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import { KalakGame } from "../models/KalakGame";
import { GamePhase, GameType, KalakRoundPhase, KalakSubmitAnswerPayload, KalakUpdateSettingsPayload, KalakVotePayload } from "shared/types";
import { generateQuestion, preloadCategories } from "../services/questionGenerator";

function getKalakGame(gameManager: GameManager, socketId: string): KalakGame | null {
  // Check if it's a host display socket
  const hostGame = gameManager.findGameByHostDisplaySocket(socketId);
  if (hostGame && hostGame.gameType === GameType.KALAK) return hostGame as KalakGame;

  // Check if it's a player socket
  const game = gameManager.findGameBySocketId(socketId);
  if (!game || game.gameType !== GameType.KALAK) return null;
  return game as KalakGame;
}

function broadcastKalakState(io: Server, game: KalakGame): void {
  // Send personalized state to each player
  for (const p of game.players) {
    if (!p.isConnected) continue;
    const sock = io.sockets.sockets.get(p.id);
    if (sock) {
      sock.emit("server:kalak-game-state", game.getGameStatePayload(p));
    }
  }

  // Send host display state
  if (game.hostDisplaySocketId) {
    const hostSock = io.sockets.sockets.get(game.hostDisplaySocketId);
    if (hostSock) {
      hostSock.emit("server:kalak-host-display", game.getHostDisplayPayload());
    }
  }
}

function broadcastLobbyState(io: Server, game: KalakGame): void {
  io.to(game.roomCode).emit("server:kalak-lobby-state", game.getLobbyState());
}

async function startNextRound(
  io: Server,
  game: KalakGame,
  timerManager: TimerManager
): Promise<void> {
  const { question, answer } = await generateQuestion(
    game.language,
    game.categories,
    game.usedQuestions,
    game.freeMode
  );

  game.setQuestion(question, answer);
  broadcastKalakState(io, game);

  // Question display phase
  const questionTime = game.timers.questionDisplay * 1000;
  if (questionTime <= 0) {
    // Skip question display, go straight to answering
    startAnsweringPhase(io, game, timerManager);
    return;
  }

  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    startAnsweringPhase(io, game, timerManager);
  }, questionTime);
}

function startAnsweringPhase(io: Server, game: KalakGame, timerManager: TimerManager): void {
  game.startAnswering();
  broadcastKalakState(io, game);

  // Emit sound event for new question
  io.to(game.roomCode).emit("server:kalak-sound", { sound: "question-start" });

  if (game.timers.answering > 0) {
    timerManager.start(io, game.roomCode, game.timers.answering, () => {
      onAnsweringTimeout(io, game, timerManager);
    });
  }
  // If answering timer is 0, wait indefinitely for all players
}

function onAnsweringTimeout(io: Server, game: KalakGame, timerManager: TimerManager): void {
  if (game.phase !== GamePhase.PLAYING || game.roundPhase !== KalakRoundPhase.ANSWERING) return;
  startVotingPhase(io, game, timerManager);
}

function startVotingPhase(io: Server, game: KalakGame, timerManager: TimerManager): void {
  game.buildVotingOptions();
  broadcastKalakState(io, game);

  io.to(game.roomCode).emit("server:kalak-sound", { sound: "voting-start" });

  if (game.timers.voting > 0) {
    timerManager.start(io, game.roomCode, game.timers.voting, () => {
      onVotingTimeout(io, game, timerManager);
    });
  }
}

function onVotingTimeout(io: Server, game: KalakGame, timerManager: TimerManager): void {
  if (game.phase !== GamePhase.PLAYING || game.roundPhase !== KalakRoundPhase.VOTING) return;
  resolveAndAdvance(io, game, timerManager);
}

function resolveAndAdvance(io: Server, game: KalakGame, timerManager: TimerManager): void {
  timerManager.stop(game.roomCode);

  const result = game.resolveRound();
  io.to(game.roomCode).emit("server:kalak-round-result", result);
  io.to(game.roomCode).emit("server:kalak-sound", { sound: "reveal" });
  broadcastKalakState(io, game);

  const revealTime = game.timers.reveal * 1000;

  // Check if we should show a leaderboard (every 5 rounds)
  const showLeaderboard = game.currentRound % 5 === 0 && game.currentRound < game.totalRounds;

  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;

    if (showLeaderboard) {
      // Show leaderboard
      io.to(game.roomCode).emit("server:kalak-leaderboard", {
        scores: game.getScoresArray(),
        afterRound: game.currentRound,
      });
      io.to(game.roomCode).emit("server:kalak-sound", { sound: "leaderboard" });

      // After leaderboard display, advance
      setTimeout(() => {
        if (game.phase !== GamePhase.PLAYING) return;
        advanceToNextOrEnd(io, game, timerManager);
      }, game.timers.leaderboard * 1000);
    } else {
      advanceToNextOrEnd(io, game, timerManager);
    }
  }, revealTime);
}

function advanceToNextOrEnd(io: Server, game: KalakGame, timerManager: TimerManager): void {
  const hasMore = game.advanceRound();
  if (!hasMore) {
    // Game over
    io.to(game.roomCode).emit("server:kalak-game-over", game.getGameOverPayload());
    io.to(game.roomCode).emit("server:kalak-sound", { sound: "game-over" });
    broadcastKalakState(io, game);
  } else {
    startNextRound(io, game, timerManager);
  }
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

    // Only host display can update settings
    if (game.hostDisplaySocketId !== socket.id) return;
    if (game.phase !== GamePhase.LOBBY) return;

    game.updateSettings(data.language, data.categories, data.totalRounds, data.freeMode, data.timers);
    broadcastLobbyState(io, game);
  });

  socket.on("client:kalak-add-category", (data: { category: string }) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;
    if (game.phase !== GamePhase.LOBBY) return;

    // Any connected socket (player or host display) can add
    game.addCategory(data.category);
    broadcastLobbyState(io, game);
  });

  socket.on("client:kalak-remove-category", (data: { category: string }) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;
    if (game.phase !== GamePhase.LOBBY) return;

    // Only host display can remove
    if (game.hostDisplaySocketId !== socket.id) return;

    game.removeCategory(data.category);
    broadcastLobbyState(io, game);
  });

  socket.on("client:kalak-start-game", async () => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;

    // Only host display can start
    if (game.hostDisplaySocketId !== socket.id) return;

    const check = game.canStart();
    if (!check.ok) {
      socket.emit("server:error", { message: check.reason });
      return;
    }

    game.start();

    // Notify everyone that game is starting (loading state)
    io.to(game.roomCode).emit("server:kalak-loading", { message: "Generating questions..." });

    // Preload questions for all categories
    await preloadCategories(game.language, game.categories, game.freeMode);

    startNextRound(io, game, timerManager);
  });

  socket.on("client:kalak-submit-answer", (data: KalakSubmitAnswerPayload) => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const result = game.submitAnswer(socket.id, data.answer);

    if (result === "rejected_correct") {
      // Tell the player they found the correct answer, re-submit a fake
      socket.emit("server:kalak-answer-rejected", {
        message: "You found the correct answer! Now submit a fake to trick others.",
      });
      return;
    }

    if (result !== "accepted") return;

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

    // Update host display with vote count
    broadcastKalakState(io, game);

    // If all voted, resolve
    if (game.allVoted()) {
      resolveAndAdvance(io, game, timerManager);
    }
  });

  socket.on("client:kalak-rematch", async () => {
    const game = getKalakGame(gameManager, socket.id);
    if (!game) return;

    // Only host display can rematch
    if (game.hostDisplaySocketId !== socket.id) return;

    game.rematch();

    io.to(game.roomCode).emit("server:kalak-loading", { message: "Generating questions..." });
    await preloadCategories(game.language, game.categories, game.freeMode);

    startNextRound(io, game, timerManager);
  });
}
