import { Server, Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { TimerManager } from "../managers/TimerManager";
import { GwdwGame } from "../models/GwdwGame";
import { GamePhase, GameType, GwdwRoundPhase, GwdwSubmitAnswerPayload, GwdwUpdateSettingsPayload, GwdwVoteAuthorPayload } from "shared/types";
import { generatePrompt, preloadPromptCategories } from "../services/promptGenerator";

function getGwdwGame(gameManager: GameManager, socketId: string): GwdwGame | null {
  const hostGame = gameManager.findGameByHostDisplaySocket(socketId);
  if (hostGame && hostGame.gameType === GameType.GWDW) return hostGame as GwdwGame;
  const game = gameManager.findGameBySocketId(socketId);
  if (!game || game.gameType !== GameType.GWDW) return null;
  return game as GwdwGame;
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

function broadcastLobbyState(io: Server, game: GwdwGame): void {
  io.to(game.roomCode).emit("server:gwdw-lobby-state", game.getLobbyState());
}

// ── Round Flow ──

async function startNextRound(io: Server, game: GwdwGame, timerManager: TimerManager): Promise<void> {
  const prompt = await generatePrompt(game.language, game.categories, game.usedPrompts);
  game.setPrompt(prompt);
  broadcastGwdwState(io, game);

  const promptTime = game.timers.promptDisplay * 1000;
  if (promptTime <= 0) {
    startWritingPhase(io, game, timerManager);
    return;
  }

  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    startWritingPhase(io, game, timerManager);
  }, promptTime);
}

function startWritingPhase(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  game.startWriting();
  broadcastGwdwState(io, game);
  io.to(game.roomCode).emit("server:gwdw-sound", { sound: "writing-start" });

  if (game.timers.writing > 0) {
    timerManager.start(io, game.roomCode, game.timers.writing, () => {
      if (game.phase !== GamePhase.PLAYING || game.roundPhase !== GwdwRoundPhase.WRITING) return;
      startRevealLoop(io, game, timerManager);
    });
  }
}

function startRevealLoop(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  timerManager.stop(game.roomCode);
  game.buildRevealOrder();

  if (game.shuffledAnswers.length === 0) {
    // Nobody answered — skip to round scores
    showRoundScores(io, game, timerManager);
    return;
  }

  showNextAnswer(io, game, timerManager);
}

function showNextAnswer(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  game.startRevealAnswer();
  broadcastGwdwState(io, game);
  io.to(game.roomCode).emit("server:gwdw-sound", { sound: "answer-reveal" });

  // Brief pause to show the answer before voting opens
  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    startAnswerVoting(io, game, timerManager);
  }, 2000);
}

function startAnswerVoting(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  game.startRevealVoting();
  broadcastGwdwState(io, game);

  if (game.timers.votingPerAnswer > 0) {
    timerManager.start(io, game.roomCode, game.timers.votingPerAnswer, () => {
      if (game.phase !== GamePhase.PLAYING || game.roundPhase !== GwdwRoundPhase.REVEAL_VOTING) return;
      resolveAndShowResult(io, game, timerManager);
    });
  }
}

function resolveAndShowResult(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  timerManager.stop(game.roomCode);

  const result = game.resolveCurrentAnswer();
  io.to(game.roomCode).emit("server:gwdw-answer-result", result);
  io.to(game.roomCode).emit("server:gwdw-sound", { sound: "author-reveal" });
  broadcastGwdwState(io, game);

  const revealTime = game.timers.revealResult * 1000;
  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    advanceOrFinishRound(io, game, timerManager);
  }, revealTime);
}

function advanceOrFinishRound(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  if (game.advanceReveal()) {
    showNextAnswer(io, game, timerManager);
  } else {
    showRoundScores(io, game, timerManager);
  }
}

function showRoundScores(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  const roundResult = game.buildRoundResult();
  io.to(game.roomCode).emit("server:gwdw-round-result", roundResult);
  io.to(game.roomCode).emit("server:gwdw-sound", { sound: "leaderboard" });
  broadcastGwdwState(io, game);

  setTimeout(() => {
    if (game.phase !== GamePhase.PLAYING) return;
    advanceToNextOrEnd(io, game, timerManager);
  }, game.timers.roundScores * 1000);
}

function advanceToNextOrEnd(io: Server, game: GwdwGame, timerManager: TimerManager): void {
  const hasMore = game.advanceRound();
  if (!hasMore) {
    io.to(game.roomCode).emit("server:gwdw-game-over", game.getGameOverPayload());
    io.to(game.roomCode).emit("server:gwdw-sound", { sound: "game-over" });
    broadcastGwdwState(io, game);
  } else {
    startNextRound(io, game, timerManager);
  }
}

// ── Socket Handlers ──

export function registerGwdwHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  timerManager: TimerManager
): void {
  socket.on("client:gwdw-update-settings", (data: GwdwUpdateSettingsPayload) => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.hostDisplaySocketId !== socket.id) return;
    if (game.phase !== GamePhase.LOBBY) return;
    game.updateSettings(data.language, data.categories, data.totalRounds, data.timers);
    broadcastLobbyState(io, game);
  });

  socket.on("client:gwdw-add-category", (data: { category: string }) => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.LOBBY) return;
    game.addCategory(data.category);
    broadcastLobbyState(io, game);
  });

  socket.on("client:gwdw-remove-category", (data: { category: string }) => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.hostDisplaySocketId !== socket.id) return;
    if (game.phase !== GamePhase.LOBBY) return;
    game.removeCategory(data.category);
    broadcastLobbyState(io, game);
  });

  socket.on("client:gwdw-start-game", async () => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.hostDisplaySocketId !== socket.id) return;

    const check = game.canStart();
    if (!check.ok) {
      socket.emit("server:error", { message: check.reason });
      return;
    }

    game.start();
    io.to(game.roomCode).emit("server:gwdw-loading", { message: "Preparing prompts..." });

    try {
      await preloadPromptCategories(game.language, game.categories);
      if (game.phase !== GamePhase.PLAYING) return;
      await startNextRound(io, game, timerManager);
    } catch (err) {
      console.error("Failed to start GWDW game:", err);
      socket.emit("server:error", { message: "Failed to generate prompts. Try again." });
    }
  });

  socket.on("client:gwdw-submit-answer", (data: GwdwSubmitAnswerPayload) => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const result = game.submitAnswer(socket.id, data.answer);
    if (result !== "accepted") return;

    const player = game.findPlayerBySocketId(socket.id);
    if (player) {
      io.to(game.roomCode).emit("server:gwdw-player-answered", { displayName: player.displayName });
    }

    if (game.allAnswered()) {
      startRevealLoop(io, game, timerManager);
    }
  });

  socket.on("client:gwdw-vote-author", (data: GwdwVoteAuthorPayload) => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.phase !== GamePhase.PLAYING) return;

    const success = game.voteAuthor(socket.id, data.guessedAuthorName);
    if (!success) return;

    const player = game.findPlayerBySocketId(socket.id);
    if (player) {
      io.to(game.roomCode).emit("server:gwdw-player-voted", { displayName: player.displayName });
    }

    broadcastGwdwState(io, game);

    if (game.allVotedForCurrentAnswer()) {
      resolveAndShowResult(io, game, timerManager);
    }
  });

  socket.on("client:gwdw-rematch", async () => {
    const game = getGwdwGame(gameManager, socket.id);
    if (!game || game.hostDisplaySocketId !== socket.id) return;

    game.rematch();
    io.to(game.roomCode).emit("server:gwdw-loading", { message: "Preparing prompts..." });

    try {
      await preloadPromptCategories(game.language, game.categories);
      if (game.phase !== GamePhase.PLAYING) return;
      await startNextRound(io, game, timerManager);
    } catch (err) {
      console.error("Failed to start GWDW rematch:", err);
      socket.emit("server:error", { message: "Failed to generate prompts. Try again." });
    }
  });
}
