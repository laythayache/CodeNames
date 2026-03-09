import {
  GamePhase, GameType, KalakAnswer, KalakGameOverPayload,
  KalakGameStatePayload, KalakLanguage, KalakLobbyStatePayload,
  KalakPlayerScore, KalakRoundPhase, KalakRoundResult, KalakVote, Player,
} from "shared/types";
import type { BaseGame } from "./BaseGame";

export class KalakGame implements BaseGame {
  gameType: GameType = GameType.KALAK;
  roomCode: string;
  phase: GamePhase = GamePhase.LOBBY;
  players: Player[] = [];
  createdAt: number = Date.now();

  // Settings
  language: KalakLanguage = KalakLanguage.ENGLISH;
  categories: string[] = ["general"];
  totalRounds: number = 10;
  freeMode: boolean = false;

  // Round state
  currentRound: number = 0;
  roundPhase: KalakRoundPhase = KalakRoundPhase.QUESTION;
  currentQuestion: string = "";
  correctAnswer: string = "";
  submittedAnswers: Map<string, string> = new Map(); // socketId → answer text
  shuffledAnswers: KalakAnswer[] = [];
  votes: Map<string, string> = new Map(); // voterSocketId → answerId

  // Scores
  scores: Map<string, KalakPlayerScore> = new Map(); // displayName → score
  roundHistory: KalakRoundResult[] = [];

  // Track used questions to avoid repeats
  usedQuestions: string[] = [];

  constructor(roomCode: string) {
    this.roomCode = roomCode;
  }

  // ── Player Management ──

  addPlayer(id: string, displayName: string, isHost: boolean): Player {
    const player: Player = {
      id,
      displayName,
      team: null,
      role: null,
      isHost,
      isConnected: true,
    };
    this.players.push(player);
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
    this.votes.delete(player.id);
  }

  // ── Settings ──

  updateSettings(language: KalakLanguage, categories: string[], totalRounds: number, freeMode: boolean): void {
    this.language = language;
    this.categories = categories.length > 0 ? categories : ["general"];
    this.totalRounds = Math.max(1, Math.min(30, totalRounds));
    this.freeMode = freeMode;
  }

  addCategory(category: string): void {
    const normalized = category.trim().toLowerCase();
    if (!normalized || this.categories.includes(normalized)) return;
    this.categories.push(normalized);
  }

  removeCategory(category: string): void {
    this.categories = this.categories.filter((c) => c !== category.toLowerCase());
    if (this.categories.length === 0) this.categories = ["general"];
  }

  // ── Game Start ──

  canStart(): { ok: boolean; reason?: string } {
    const connected = this.players.filter((p) => p.isConnected);
    if (connected.length < 3) {
      return { ok: false, reason: "Need at least 3 players" };
    }
    return { ok: true };
  }

  start(): void {
    this.phase = GamePhase.PLAYING;
    this.currentRound = 0;
    this.roundHistory = [];
    this.usedQuestions = [];

    // Initialize scores for all players
    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName,
        score: 0,
        correctAnswers: 0,
        timesFooledOthers: 0,
      });
    }
  }

  // ── Round Flow ──

  setQuestion(question: string, answer: string): void {
    this.currentRound++;
    this.roundPhase = KalakRoundPhase.QUESTION;
    this.currentQuestion = question;
    this.correctAnswer = answer;
    this.submittedAnswers.clear();
    this.shuffledAnswers = [];
    this.votes.clear();
    this.usedQuestions.push(question);
  }

  startAnswering(): void {
    this.roundPhase = KalakRoundPhase.ANSWERING;
  }

  submitAnswer(socketId: string, answer: string): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player || !player.isConnected) return false;
    if (this.roundPhase !== KalakRoundPhase.ANSWERING) return false;
    if (this.submittedAnswers.has(socketId)) return false; // already submitted

    this.submittedAnswers.set(socketId, answer.trim());
    return true;
  }

  allAnswered(): boolean {
    const connected = this.players.filter((p) => p.isConnected);
    return connected.every((p) => this.submittedAnswers.has(p.id));
  }

  buildVotingOptions(): void {
    this.roundPhase = KalakRoundPhase.VOTING;

    // Build answer list: player answers + correct answer
    const answers: KalakAnswer[] = [];

    for (const [socketId, text] of this.submittedAnswers) {
      const player = this.findPlayerBySocketId(socketId);
      if (!player) continue;
      answers.push({
        id: `player-${socketId}`,
        text,
        playerId: socketId,
        playerName: player.displayName,
      });
    }

    // Add the correct answer
    answers.push({
      id: "CORRECT",
      text: this.correctAnswer,
      playerId: "CORRECT",
      playerName: "",
    });

    // Shuffle (Fisher-Yates)
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    this.shuffledAnswers = answers;
    this.votes.clear();
  }

  vote(socketId: string, answerId: string): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player || !player.isConnected) return false;
    if (this.roundPhase !== KalakRoundPhase.VOTING) return false;
    if (this.votes.has(socketId)) return false; // already voted

    // Can't vote for your own answer
    if (answerId === `player-${socketId}`) return false;

    // Validate answerId exists
    if (!this.shuffledAnswers.some((a) => a.id === answerId)) return false;

    this.votes.set(socketId, answerId);
    return true;
  }

  allVoted(): boolean {
    const connected = this.players.filter((p) => p.isConnected);
    return connected.every((p) => this.votes.has(p.id));
  }

  resolveRound(): KalakRoundResult {
    this.roundPhase = KalakRoundPhase.REVEAL;

    const votesList: KalakVote[] = [];
    const scoreDeltas: Record<string, { correct: number; fooled: number; total: number }> = {};

    // Initialize deltas for all players
    for (const p of this.players) {
      scoreDeltas[p.displayName] = { correct: 0, fooled: 0, total: 0 };
    }

    // Process votes
    for (const [voterSocketId, answerId] of this.votes) {
      const voter = this.findPlayerBySocketId(voterSocketId);
      if (!voter) continue;

      votesList.push({
        voterId: voterSocketId,
        voterName: voter.displayName,
        answerId,
      });

      if (answerId === "CORRECT") {
        // Voter picked the correct answer: +2
        scoreDeltas[voter.displayName].correct = 2;
        scoreDeltas[voter.displayName].total += 2;

        const sc = this.scores.get(voter.displayName);
        if (sc) {
          sc.score += 2;
          sc.correctAnswers++;
        }
      } else {
        // Voter was fooled by someone's fake answer: +1 for the faker
        const fakerAnswer = this.shuffledAnswers.find((a) => a.id === answerId);
        if (fakerAnswer && fakerAnswer.playerName) {
          scoreDeltas[fakerAnswer.playerName].fooled += 1;
          scoreDeltas[fakerAnswer.playerName].total += 1;

          const sc = this.scores.get(fakerAnswer.playerName);
          if (sc) {
            sc.score += 1;
            sc.timesFooledOthers++;
          }
        }
      }
    }

    const result: KalakRoundResult = {
      roundNumber: this.currentRound,
      question: this.currentQuestion,
      correctAnswer: this.correctAnswer,
      answers: this.shuffledAnswers,
      votes: votesList,
      scoreDeltas,
    };

    this.roundHistory.push(result);
    return result;
  }

  advanceRound(): boolean {
    if (this.currentRound >= this.totalRounds) {
      this.phase = GamePhase.GAME_OVER;
      return false; // game is over
    }
    return true; // more rounds to play
  }

  // ── State Serialization ──

  getGameStatePayload(forPlayer: Player): KalakGameStatePayload {
    const answeredNames = Array.from(this.submittedAnswers.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const votedNames = Array.from(this.votes.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    // Only show answers during VOTING and REVEAL
    let answers: { id: string; text: string; isOwn: boolean }[] | null = null;
    if (this.roundPhase === KalakRoundPhase.VOTING || this.roundPhase === KalakRoundPhase.REVEAL) {
      answers = this.shuffledAnswers.map((a) => ({
        id: a.id,
        text: a.text,
        isOwn: a.playerId === forPlayer.id,
      }));
    }

    // Only show round result during REVEAL
    const roundResult = this.roundPhase === KalakRoundPhase.REVEAL
      ? this.roundHistory[this.roundHistory.length - 1] ?? null
      : null;

    return {
      roomCode: this.roomCode,
      gameType: GameType.KALAK,
      phase: this.phase,
      roundPhase: this.roundPhase,
      players: this.players,
      scores: this.getScoresArray(),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      language: this.language,
      categories: this.categories,
      question: this.currentQuestion || null,
      answers,
      playersAnswered: answeredNames,
      playersVoted: votedNames,
      roundResult,
      timerSeconds: null, // set by handler via timer events
    };
  }

  getLobbyState(): KalakLobbyStatePayload {
    return {
      gameType: GameType.KALAK,
      players: this.players,
      language: this.language,
      categories: this.categories,
      totalRounds: this.totalRounds,
      freeMode: this.freeMode,
    };
  }

  getGameOverPayload(): KalakGameOverPayload {
    const scores = this.getScoresArray();
    const winner = scores.length > 0 ? scores[0].displayName : "";
    return {
      scores,
      roundHistory: this.roundHistory,
      winner,
    };
  }

  getScoresArray(): KalakPlayerScore[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score);
  }

  // ── Rematch ──

  rematch(): void {
    this.phase = GamePhase.PLAYING;
    this.currentRound = 0;
    this.roundHistory = [];
    this.usedQuestions = [];
    this.submittedAnswers.clear();
    this.shuffledAnswers = [];
    this.votes.clear();

    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName,
        score: 0,
        correctAnswers: 0,
        timesFooledOthers: 0,
      });
    }
  }
}
