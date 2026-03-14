import {
  Avatar, GamePhase, GameType, GwdwAnswer, GwdwAnswerResult, GwdwAward,
  GwdwGameOverPayload, GwdwGameStatePayload, GwdwHostDisplayPayload,
  GwdwLanguage, GwdwLobbyStatePayload, GwdwPlayerScore, GwdwRoundPhase,
  GwdwRoundResult, GwdwTimerConfig, GwdwVote, Player,
  DEFAULT_GWDW_TIMERS,
} from "shared/types";
import type { BaseGame } from "./BaseGame";

export class GwdwGame implements BaseGame {
  gameType: GameType = GameType.GWDW;
  roomCode: string;
  phase: GamePhase = GamePhase.LOBBY;
  players: Player[] = [];
  createdAt: number = Date.now();
  hostDisplaySocketId: string | null = null;

  // Settings
  language: GwdwLanguage = GwdwLanguage.ENGLISH;
  categories: string[] = ["personal", "hypothetical"];
  totalRounds: number = 10;
  timers: GwdwTimerConfig = { ...DEFAULT_GWDW_TIMERS };

  // Round state
  currentRound: number = 0;
  roundPhase: GwdwRoundPhase = GwdwRoundPhase.PROMPT;
  currentPrompt: string = "";
  submittedAnswers: Map<string, string> = new Map(); // socketId → answer text
  shuffledAnswers: GwdwAnswer[] = [];

  // Reveal loop state
  revealIndex: number = 0;
  currentRevealVotes: Map<string, string> = new Map(); // voterSocketId → guessedAuthorName
  currentRoundResults: GwdwAnswerResult[] = [];
  currentScoreDeltas: Record<string, number> = {};

  // Scores
  scores: Map<string, GwdwPlayerScore> = new Map();
  roundHistory: GwdwRoundResult[] = [];
  usedPrompts: string[] = [];

  constructor(roomCode: string) {
    this.roomCode = roomCode;
  }

  // ── Player Management ──

  addPlayer(id: string, displayName: string, isHost: boolean, avatar?: Avatar | null): Player {
    const player: Player = {
      id, displayName, team: null, role: null, isHost,
      isConnected: true, avatar: avatar || null,
      joinedAtRound: this.phase === GamePhase.PLAYING ? this.currentRound : null,
    };
    this.players.push(player);
    if (this.phase === GamePhase.PLAYING) {
      this.scores.set(displayName, {
        displayName, score: 0, correctGuesses: 0,
        timesIdentified: 0, timesEvaded: 0, roundsPlayed: 0,
      });
    }
    return player;
  }

  removePlayer(displayName: string): void {
    this.players = this.players.filter((p) => p.displayName !== displayName);
    this.scores.delete(displayName);
  }

  findPlayerBySocketId(socketId: string): Player | undefined {
    return this.players.find((p) => p.id === socketId);
  }

  findPlayerByName(displayName: string): Player | undefined {
    return this.players.find((p) => p.displayName === displayName);
  }

  isNameTaken(displayName: string): boolean {
    return this.players.some((p) => p.displayName === displayName);
  }

  removeVotesForPlayer(displayName: string): void {
    const player = this.findPlayerByName(displayName);
    if (!player) return;
    this.submittedAnswers.delete(player.id);
    this.currentRevealVotes.delete(player.id);
  }

  getConnectedPlayers(): Player[] {
    return this.players.filter((p) => p.isConnected);
  }

  // ── Settings ──

  updateSettings(language: GwdwLanguage, categories: string[], totalRounds: number, timers: GwdwTimerConfig): void {
    this.language = language;
    this.categories = categories.length > 0 ? categories : ["personal"];
    this.totalRounds = Math.max(1, Math.min(30, totalRounds));
    this.timers = timers;
  }

  addCategory(category: string): void {
    const normalized = category.trim().toLowerCase();
    if (!normalized || this.categories.includes(normalized)) return;
    this.categories.push(normalized);
  }

  removeCategory(category: string): void {
    this.categories = this.categories.filter((c) => c !== category.toLowerCase());
    if (this.categories.length === 0) this.categories = ["personal"];
  }

  // ── Game Start ──

  canStart(): { ok: boolean; reason?: string } {
    const connected = this.getConnectedPlayers();
    if (connected.length < 3) {
      return { ok: false, reason: "Need at least 3 players" };
    }
    return { ok: true };
  }

  start(): void {
    this.phase = GamePhase.PLAYING;
    this.currentRound = 0;
    this.roundHistory = [];
    this.usedPrompts = [];
    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName, score: 0, correctGuesses: 0,
        timesIdentified: 0, timesEvaded: 0, roundsPlayed: 0,
      });
    }
  }

  // ── Round Flow ──

  setPrompt(prompt: string): void {
    this.currentRound++;
    this.roundPhase = GwdwRoundPhase.PROMPT;
    this.currentPrompt = prompt;
    this.submittedAnswers.clear();
    this.shuffledAnswers = [];
    this.revealIndex = 0;
    this.currentRevealVotes.clear();
    this.currentRoundResults = [];
    this.currentScoreDeltas = {};
    this.usedPrompts.push(prompt);

    // Initialize score deltas for all players
    for (const p of this.players) {
      this.currentScoreDeltas[p.displayName] = 0;
    }
  }

  startWriting(): void {
    this.roundPhase = GwdwRoundPhase.WRITING;
  }

  submitAnswer(socketId: string, text: string): "accepted" | "already_submitted" | "invalid" {
    const player = this.findPlayerBySocketId(socketId);
    if (!player || !player.isConnected) return "invalid";
    if (this.roundPhase !== GwdwRoundPhase.WRITING) return "invalid";
    if (this.submittedAnswers.has(socketId)) return "already_submitted";
    this.submittedAnswers.set(socketId, text.trim());
    return "accepted";
  }

  allAnswered(): boolean {
    const connected = this.getConnectedPlayers();
    return connected.every((p) => this.submittedAnswers.has(p.id));
  }

  buildRevealOrder(): void {
    const answers: GwdwAnswer[] = [];
    for (const [socketId, text] of this.submittedAnswers) {
      const player = this.findPlayerBySocketId(socketId);
      if (!player) continue;
      answers.push({
        id: `answer-${answers.length}`,
        text,
        authorId: socketId,
        authorName: player.displayName,
      });
    }
    // Fisher-Yates shuffle
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    this.shuffledAnswers = answers;
    this.revealIndex = 0;
  }

  startRevealAnswer(): void {
    this.roundPhase = GwdwRoundPhase.REVEAL_ANSWER;
    this.currentRevealVotes.clear();
  }

  getCurrentRevealAnswer(): GwdwAnswer | null {
    return this.shuffledAnswers[this.revealIndex] ?? null;
  }

  startRevealVoting(): void {
    this.roundPhase = GwdwRoundPhase.REVEAL_VOTING;
  }

  voteAuthor(voterSocketId: string, guessedAuthorName: string): boolean {
    const voter = this.findPlayerBySocketId(voterSocketId);
    if (!voter || !voter.isConnected) return false;
    if (this.roundPhase !== GwdwRoundPhase.REVEAL_VOTING) return false;

    const currentAnswer = this.getCurrentRevealAnswer();
    if (!currentAnswer) return false;

    // Author cannot vote on their own answer
    if (currentAnswer.authorId === voterSocketId) return false;

    // Validate guessed player exists
    if (!this.findPlayerByName(guessedAuthorName)) return false;

    this.currentRevealVotes.set(voterSocketId, guessedAuthorName);
    return true;
  }

  allVotedForCurrentAnswer(): boolean {
    const currentAnswer = this.getCurrentRevealAnswer();
    if (!currentAnswer) return false;

    const connected = this.getConnectedPlayers();
    // All connected players except the author must have voted
    return connected
      .filter((p) => p.id !== currentAnswer.authorId)
      .every((p) => this.currentRevealVotes.has(p.id));
  }

  resolveCurrentAnswer(): GwdwAnswerResult {
    this.roundPhase = GwdwRoundPhase.REVEAL_RESULT;

    const currentAnswer = this.getCurrentRevealAnswer()!;
    const authorName = currentAnswer.authorName;
    const votes: GwdwVote[] = [];
    const correctVoters: string[] = [];
    const voterPoints: Record<string, number> = {};
    let wrongGuessCount = 0;
    let correctGuessCount = 0;

    for (const [voterSocketId, guessedName] of this.currentRevealVotes) {
      const voter = this.findPlayerBySocketId(voterSocketId);
      if (!voter) continue;

      votes.push({ voterName: voter.displayName, guessedAuthorName: guessedName });

      if (guessedName === authorName) {
        // Correct guess: +2
        correctVoters.push(voter.displayName);
        voterPoints[voter.displayName] = 2;
        correctGuessCount++;

        const sc = this.scores.get(voter.displayName);
        if (sc) { sc.score += 2; sc.correctGuesses++; }
        this.currentScoreDeltas[voter.displayName] = (this.currentScoreDeltas[voter.displayName] || 0) + 2;
      } else {
        voterPoints[voter.displayName] = 0;
        wrongGuessCount++;
      }
    }

    // Author stealth points: +1 per wrong guess, BUT only if at least 1 correct
    let authorPoints = 0;
    if (correctGuessCount > 0 && wrongGuessCount > 0) {
      authorPoints = wrongGuessCount;
      const sc = this.scores.get(authorName);
      if (sc) { sc.score += authorPoints; sc.timesEvaded += wrongGuessCount; }
      this.currentScoreDeltas[authorName] = (this.currentScoreDeltas[authorName] || 0) + authorPoints;
    }

    // Track times identified
    if (correctGuessCount > 0) {
      const sc = this.scores.get(authorName);
      if (sc) sc.timesIdentified += correctGuessCount;
    }

    const result: GwdwAnswerResult = {
      answerId: currentAnswer.id,
      answerText: currentAnswer.text,
      authorName,
      votes,
      correctVoters,
      authorPoints,
      voterPoints,
    };

    this.currentRoundResults.push(result);
    return result;
  }

  advanceReveal(): boolean {
    this.revealIndex++;
    return this.revealIndex < this.shuffledAnswers.length;
  }

  buildRoundResult(): GwdwRoundResult {
    this.roundPhase = GwdwRoundPhase.ROUND_SCORES;

    // Track who didn't answer
    const connected = this.getConnectedPlayers();
    const didntAnswer: string[] = [];
    for (const p of connected) {
      if (!this.submittedAnswers.has(p.id)) {
        didntAnswer.push(p.displayName);
      }
    }

    // Increment roundsPlayed
    for (const p of connected) {
      const sc = this.scores.get(p.displayName);
      if (sc) sc.roundsPlayed++;
    }

    const result: GwdwRoundResult = {
      roundNumber: this.currentRound,
      prompt: this.currentPrompt,
      answerResults: this.currentRoundResults,
      scoreDeltas: { ...this.currentScoreDeltas },
      didntAnswer,
    };

    this.roundHistory.push(result);
    return result;
  }

  advanceRound(): boolean {
    if (this.currentRound >= this.totalRounds) {
      this.phase = GamePhase.GAME_OVER;
      return false;
    }
    return true;
  }

  // ── Awards ──

  computeAwards(): GwdwAward[] {
    const awards: GwdwAward[] = [];
    const scores = this.getScoresArray();
    if (scores.length === 0) return awards;

    // Master of Disguise — most times evaded
    const disguise = scores.reduce((a, b) => a.timesEvaded > b.timesEvaded ? a : b);
    if (disguise.timesEvaded > 0) {
      awards.push({
        title: "Master of Disguise", titleAr: "سيد التنكر",
        playerName: disguise.displayName,
        value: `Fooled others ${disguise.timesEvaded} times`, emoji: "🎭",
      });
    }

    // Human Lie Detector — most correct guesses
    const detector = scores.reduce((a, b) => a.correctGuesses > b.correctGuesses ? a : b);
    if (detector.correctGuesses > 0) {
      awards.push({
        title: "Human Lie Detector", titleAr: "كاشف الكذب",
        playerName: detector.displayName,
        value: `${detector.correctGuesses} correct guesses`, emoji: "🔍",
      });
    }

    // Open Book — most times correctly identified by others
    const openBook = scores.reduce((a, b) => a.timesIdentified > b.timesIdentified ? a : b);
    if (openBook.timesIdentified > 0) {
      awards.push({
        title: "Open Book", titleAr: "كتاب مفتوح",
        playerName: openBook.displayName,
        value: `Identified ${openBook.timesIdentified} times`, emoji: "📖",
      });
    }

    // Ghost Writer — most missed answers
    const afkCount: Record<string, number> = {};
    for (const r of this.roundHistory) {
      for (const name of r.didntAnswer) {
        afkCount[name] = (afkCount[name] || 0) + 1;
      }
    }
    const ghostEntries = Object.entries(afkCount);
    if (ghostEntries.length > 0) {
      const [ghostName, ghostTimes] = ghostEntries.reduce((a, b) => a[1] > b[1] ? a : b);
      awards.push({
        title: "Ghost Writer", titleAr: "الكاتب الشبح",
        playerName: ghostName,
        value: `Went AFK ${ghostTimes} times`, emoji: "👻",
      });
    }

    // Consistent Performer — highest avg pts/round (not the winner)
    const withRounds = scores.filter((s) => s.roundsPlayed > 0);
    if (withRounds.length > 0) {
      const consistent = withRounds.reduce((a, b) =>
        (a.score / a.roundsPlayed) > (b.score / b.roundsPlayed) ? a : b
      );
      if (consistent.score > 0 && consistent.displayName !== scores[0].displayName) {
        awards.push({
          title: "Steady Hustler", titleAr: "المحتال الثابت",
          playerName: consistent.displayName,
          value: `${(consistent.score / consistent.roundsPlayed).toFixed(1)} pts/round`, emoji: "📈",
        });
      }
    }

    return awards;
  }

  // ── State Serialization ──

  getGameStatePayload(forPlayer: Player): GwdwGameStatePayload {
    const answeredNames = Array.from(this.submittedAnswers.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const votedNames = Array.from(this.currentRevealVotes.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const currentAnswer = this.getCurrentRevealAnswer();
    const isCurrentAuthor = currentAnswer ? currentAnswer.authorId === forPlayer.id : false;

    // During REVEAL_RESULT, show the latest result
    const currentAnswerResult = this.roundPhase === GwdwRoundPhase.REVEAL_RESULT
      ? this.currentRoundResults[this.currentRoundResults.length - 1] ?? null
      : null;

    const roundResult = this.roundPhase === GwdwRoundPhase.ROUND_SCORES
      ? this.roundHistory[this.roundHistory.length - 1] ?? null
      : null;

    return {
      roomCode: this.roomCode,
      gameType: GameType.GWDW,
      phase: this.phase,
      roundPhase: this.roundPhase,
      players: this.players,
      scores: this.getScoresArray(),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      language: this.language,
      categories: this.categories,
      prompt: this.currentPrompt || null,
      playersAnswered: answeredNames,
      currentRevealAnswer: currentAnswer && (this.roundPhase === GwdwRoundPhase.REVEAL_ANSWER || this.roundPhase === GwdwRoundPhase.REVEAL_VOTING || this.roundPhase === GwdwRoundPhase.REVEAL_RESULT)
        ? { id: currentAnswer.id, text: currentAnswer.text }
        : null,
      currentRevealIndex: this.revealIndex,
      totalAnswers: this.shuffledAnswers.length,
      isCurrentAuthor,
      currentVoters: votedNames,
      currentAnswerResult,
      roundResult,
      timerSeconds: null,
    };
  }

  getHostDisplayPayload(): GwdwHostDisplayPayload {
    const answeredNames = Array.from(this.submittedAnswers.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const votedNames = Array.from(this.currentRevealVotes.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const currentAnswer = this.getCurrentRevealAnswer();

    // Build vote distribution for TV display
    const voteDistribution: Record<string, number> = {};
    for (const guessedName of this.currentRevealVotes.values()) {
      voteDistribution[guessedName] = (voteDistribution[guessedName] || 0) + 1;
    }

    const currentAnswerResult = this.roundPhase === GwdwRoundPhase.REVEAL_RESULT
      ? this.currentRoundResults[this.currentRoundResults.length - 1] ?? null
      : null;

    const roundResult = this.roundPhase === GwdwRoundPhase.ROUND_SCORES
      ? this.roundHistory[this.roundHistory.length - 1] ?? null
      : null;

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      roundPhase: this.roundPhase,
      players: this.players,
      scores: this.getScoresArray(),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      language: this.language,
      categories: this.categories,
      prompt: this.currentPrompt || null,
      playersAnswered: answeredNames,
      currentRevealAnswer: currentAnswer && (this.roundPhase === GwdwRoundPhase.REVEAL_ANSWER || this.roundPhase === GwdwRoundPhase.REVEAL_VOTING || this.roundPhase === GwdwRoundPhase.REVEAL_RESULT)
        ? { id: currentAnswer.id, text: currentAnswer.text }
        : null,
      currentRevealIndex: this.revealIndex,
      totalAnswers: this.shuffledAnswers.length,
      voteDistribution,
      currentVoters: votedNames,
      currentAnswerResult,
      roundResult,
      timerSeconds: null,
      playerCount: this.getConnectedPlayers().length,
    };
  }

  getLobbyState(): GwdwLobbyStatePayload {
    return {
      gameType: GameType.GWDW,
      roomCode: this.roomCode,
      players: this.players,
      language: this.language,
      categories: this.categories,
      totalRounds: this.totalRounds,
      timers: this.timers,
    };
  }

  getGameOverPayload(): GwdwGameOverPayload {
    const scores = this.getScoresArray();
    return {
      scores,
      roundHistory: this.roundHistory,
      winner: scores.length > 0 ? scores[0].displayName : "",
      awards: this.computeAwards(),
    };
  }

  getScoresArray(): GwdwPlayerScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  // ── Rematch ──

  rematch(): void {
    this.phase = GamePhase.PLAYING;
    this.currentRound = 0;
    this.roundHistory = [];
    this.usedPrompts = [];
    this.submittedAnswers.clear();
    this.shuffledAnswers = [];
    this.currentRevealVotes.clear();
    this.currentRoundResults = [];
    this.currentScoreDeltas = {};

    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName, score: 0, correctGuesses: 0,
        timesIdentified: 0, timesEvaded: 0, roundsPlayed: 0,
      });
    }
  }
}
