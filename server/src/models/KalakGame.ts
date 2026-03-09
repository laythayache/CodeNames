import {
  Avatar,
  GamePhase, GameType, KalakAnswer, KalakAward, KalakGameOverPayload,
  KalakGameStatePayload, KalakHostDisplayPayload, KalakLanguage, KalakLobbyStatePayload,
  KalakPlayerScore, KalakRoundPhase, KalakRoundResult, KalakScoreDelta, KalakTimerConfig, KalakVote, Player,
  DEFAULT_KALAK_TIMERS,
} from "shared/types";
import type { BaseGame } from "./BaseGame";
import { matchesCorrectAnswer, groupSimilarAnswers } from "../services/nlp";

export class KalakGame implements BaseGame {
  gameType: GameType = GameType.KALAK;
  roomCode: string;
  phase: GamePhase = GamePhase.LOBBY;
  players: Player[] = [];
  createdAt: number = Date.now();

  // Host display socket ID (laptop — not a player)
  hostDisplaySocketId: string | null = null;

  // Settings
  language: KalakLanguage = KalakLanguage.ENGLISH;
  categories: string[] = ["general"];
  totalRounds: number = 10;
  freeMode: boolean = false;
  timers: KalakTimerConfig = { ...DEFAULT_KALAK_TIMERS };

  // Round state
  currentRound: number = 0;
  roundPhase: KalakRoundPhase = KalakRoundPhase.QUESTION;
  currentQuestion: string = "";
  correctAnswer: string = "";
  submittedAnswers: Map<string, string> = new Map(); // socketId → answer text
  rejectedAnswers: Set<string> = new Set(); // socketIds who guessed correctly and were told to re-submit
  knewCorrectAnswer: Set<string> = new Set(); // socketIds who ever submitted the correct answer this round
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

  addPlayer(id: string, displayName: string, isHost: boolean, avatar?: Avatar | null): Player {
    const player: Player = {
      id,
      displayName,
      team: null,
      role: null,
      isHost,
      isConnected: true,
      avatar: avatar || null,
      joinedAtRound: this.phase === GamePhase.PLAYING ? this.currentRound : null,
    };
    this.players.push(player);

    // Initialize score if game is in progress (mid-game join)
    if (this.phase === GamePhase.PLAYING) {
      this.scores.set(displayName, {
        displayName,
        score: 0,
        correctAnswers: 0,
        timesFooledOthers: 0,
        timesGotFooled: 0,
        roundsPlayed: 0,
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
    this.votes.delete(player.id);
  }

  getConnectedPlayers(): Player[] {
    return this.players.filter((p) => p.isConnected);
  }

  // ── Settings ──

  updateSettings(
    language: KalakLanguage,
    categories: string[],
    totalRounds: number,
    freeMode: boolean,
    timers: KalakTimerConfig
  ): void {
    this.language = language;
    this.categories = categories.length > 0 ? categories : ["general"];
    this.totalRounds = Math.max(1, Math.min(30, totalRounds));
    this.freeMode = freeMode;
    this.timers = timers;
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
    this.usedQuestions = [];

    // Initialize scores for all players
    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName,
        score: 0,
        correctAnswers: 0,
        timesFooledOthers: 0,
        timesGotFooled: 0,
        roundsPlayed: 0,
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
    this.rejectedAnswers.clear();
    this.knewCorrectAnswer.clear();
    this.shuffledAnswers = [];
    this.votes.clear();
    this.usedQuestions.push(question);
  }

  startAnswering(): void {
    this.roundPhase = KalakRoundPhase.ANSWERING;
  }

  /**
   * Submit an answer. Returns:
   * - "accepted" if the fake answer was accepted
   * - "rejected_correct" if the answer matched the correct one (player must re-submit)
   * - "already_submitted" if they already have a valid answer
   * - "invalid" if can't submit (wrong phase, disconnected, etc.)
   */
  submitAnswer(socketId: string, answer: string): "accepted" | "rejected_correct" | "already_submitted" | "invalid" {
    const player = this.findPlayerBySocketId(socketId);
    if (!player || !player.isConnected) return "invalid";
    if (this.roundPhase !== KalakRoundPhase.ANSWERING) return "invalid";

    // If they already have an accepted answer, reject (unless previously rejected)
    if (this.submittedAnswers.has(socketId) && !this.rejectedAnswers.has(socketId)) {
      return "already_submitted";
    }

    // Check if answer matches the correct answer via NLP
    if (matchesCorrectAnswer(answer.trim(), this.correctAnswer)) {
      this.knewCorrectAnswer.add(socketId);
      this.rejectedAnswers.add(socketId);
      this.submittedAnswers.delete(socketId); // clear any previous attempt
      return "rejected_correct";
    }

    // Accept the fake answer
    this.rejectedAnswers.delete(socketId);
    this.submittedAnswers.set(socketId, answer.trim());
    return "accepted";
  }

  allAnswered(): boolean {
    const connected = this.getConnectedPlayers();
    return connected.every((p) => this.submittedAnswers.has(p.id) && !this.rejectedAnswers.has(p.id));
  }

  buildVotingOptions(): void {
    this.roundPhase = KalakRoundPhase.VOTING;

    // Collect all submitted answers with player info
    const rawAnswers: { playerId: string; playerName: string; text: string }[] = [];
    for (const [socketId, text] of this.submittedAnswers) {
      const player = this.findPlayerBySocketId(socketId);
      if (!player) continue;
      rawAnswers.push({ playerId: socketId, playerName: player.displayName, text });
    }

    // Group similar answers (merge duplicates)
    const groups = groupSimilarAnswers(rawAnswers);

    // Build answer list from merged groups
    const answers: KalakAnswer[] = groups.map((g, i) => ({
      id: `fake-${i}`,
      text: g.text,
      playerIds: g.playerIds,
      playerNames: g.playerNames,
    }));

    // Add the correct answer
    answers.push({
      id: "CORRECT",
      text: this.correctAnswer,
      playerIds: ["CORRECT"],
      playerNames: [],
    });

    // Shuffle (Fisher-Yates)
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    this.shuffledAnswers = answers;
    this.votes.clear();
  }

  /**
   * Vote for an answer. Can change vote (re-call with different answerId).
   * Returns true if vote was recorded.
   */
  vote(socketId: string, answerId: string): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player || !player.isConnected) return false;
    if (this.roundPhase !== KalakRoundPhase.VOTING) return false;

    // Validate answerId exists
    if (!this.shuffledAnswers.some((a) => a.id === answerId)) return false;

    // Allow voting for own answer (but 0 points — handled in resolveRound)
    // Allow changing vote
    this.votes.set(socketId, answerId);
    return true;
  }

  allVoted(): boolean {
    const connected = this.getConnectedPlayers();
    return connected.every((p) => this.votes.has(p.id));
  }

  resolveRound(): KalakRoundResult {
    this.roundPhase = KalakRoundPhase.REVEAL;

    const votesList: KalakVote[] = [];
    const scoreDeltas: Record<string, KalakScoreDelta> = {};

    // Initialize deltas for all connected players
    for (const p of this.players) {
      scoreDeltas[p.displayName] = { correct: 0, fooled: 0, total: 0 };
    }

    // Track who didn't answer / didn't vote
    const connected = this.getConnectedPlayers();
    const didntAnswer: string[] = [];
    const didntVote: string[] = [];

    for (const p of connected) {
      if (!this.submittedAnswers.has(p.id) || this.rejectedAnswers.has(p.id)) {
        didntAnswer.push(p.displayName);
      }
      if (!this.votes.has(p.id)) {
        didntVote.push(p.displayName);
      }
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

      const votedAnswer = this.shuffledAnswers.find((a) => a.id === answerId);
      if (!votedAnswer) continue;

      // Check if voter voted for their own answer (merged group)
      const isOwnAnswer = votedAnswer.playerIds.includes(voterSocketId);
      if (isOwnAnswer) {
        // Vote doesn't count at all — no points for anyone
        continue;
      }

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
        // Voter was fooled by a fake answer: +1 for each author of that fake
        for (const fakerName of votedAnswer.playerNames) {
          if (scoreDeltas[fakerName]) {
            scoreDeltas[fakerName].fooled += 1;
            scoreDeltas[fakerName].total += 1;
          }

          const sc = this.scores.get(fakerName);
          if (sc) {
            sc.score += 1;
            sc.timesFooledOthers++;
          }
        }

        // Track that voter got fooled
        const voterSc = this.scores.get(voter.displayName);
        if (voterSc) {
          voterSc.timesGotFooled++;
        }
      }
    }

    // Increment roundsPlayed for connected players
    for (const p of connected) {
      const sc = this.scores.get(p.displayName);
      if (sc) sc.roundsPlayed++;
    }

    // Track who knew the correct answer
    const knewCorrectNames: string[] = [];
    for (const socketId of this.knewCorrectAnswer) {
      const p = this.findPlayerBySocketId(socketId);
      if (p) knewCorrectNames.push(p.displayName);
    }

    const result: KalakRoundResult = {
      roundNumber: this.currentRound,
      question: this.currentQuestion,
      correctAnswer: this.correctAnswer,
      answers: this.shuffledAnswers,
      votes: votesList,
      scoreDeltas,
      didntAnswer,
      didntVote,
      knewCorrectAnswer: knewCorrectNames,
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

  // ── Awards ──

  computeAwards(): KalakAward[] {
    const awards: KalakAward[] = [];
    const scores = this.getScoresArray();
    if (scores.length === 0) return awards;

    // Most Deceptive — fooled the most people
    const mostDeceptive = scores.reduce((a, b) => a.timesFooledOthers > b.timesFooledOthers ? a : b);
    if (mostDeceptive.timesFooledOthers > 0) {
      awards.push({
        title: "Master Manipulator",
        titleAr: "سيد التلاعب",
        playerName: mostDeceptive.displayName,
        value: `Fooled others ${mostDeceptive.timesFooledOthers} times`,
        emoji: "🎭",
      });
    }

    // Most Gullible — got fooled the most
    const mostGullible = scores.reduce((a, b) => a.timesGotFooled > b.timesGotFooled ? a : b);
    if (mostGullible.timesGotFooled > 0) {
      awards.push({
        title: "Most Gullible",
        titleAr: "الأكثر سذاجة",
        playerName: mostGullible.displayName,
        value: `Got fooled ${mostGullible.timesGotFooled} times`,
        emoji: "🤡",
      });
    }

    // Trivia Genius — most correct answers
    const triviaGenius = scores.reduce((a, b) => a.correctAnswers > b.correctAnswers ? a : b);
    if (triviaGenius.correctAnswers > 0) {
      awards.push({
        title: "Trivia Genius",
        titleAr: "عبقري المعلومات",
        playerName: triviaGenius.displayName,
        value: `${triviaGenius.correctAnswers} correct answers`,
        emoji: "🧠",
      });
    }

    // Ghost Player — who didn't answer the most (from round history)
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
        title: "Ghost Player",
        titleAr: "اللاعب الشبح",
        playerName: ghostName,
        value: `Went AFK ${ghostTimes} times`,
        emoji: "👻",
      });
    }

    // Lucky Guesser — who submitted the correct answer most (from knewCorrectAnswer)
    const correctGuessCount: Record<string, number> = {};
    for (const r of this.roundHistory) {
      for (const name of r.knewCorrectAnswer) {
        correctGuessCount[name] = (correctGuessCount[name] || 0) + 1;
      }
    }
    const guessEntries = Object.entries(correctGuessCount);
    if (guessEntries.length > 0) {
      const [guesserName, guesserTimes] = guessEntries.reduce((a, b) => a[1] > b[1] ? a : b);
      awards.push({
        title: "Walking Encyclopedia",
        titleAr: "موسوعة متنقلة",
        playerName: guesserName,
        value: `Knew the answer ${guesserTimes} times`,
        emoji: "📚",
      });
    }

    // Consistent Scorer — highest average points per round
    const withRounds = scores.filter((s) => s.roundsPlayed > 0);
    if (withRounds.length > 0) {
      const consistentScorer = withRounds.reduce((a, b) =>
        (a.score / a.roundsPlayed) > (b.score / b.roundsPlayed) ? a : b
      );
      if (consistentScorer.score > 0 && consistentScorer.displayName !== scores[0].displayName) {
        awards.push({
          title: "Steady Hustler",
          titleAr: "المحتال الثابت",
          playerName: consistentScorer.displayName,
          value: `${(consistentScorer.score / consistentScorer.roundsPlayed).toFixed(1)} pts/round`,
          emoji: "📈",
        });
      }
    }

    return awards;
  }

  // ── State Serialization ──

  getGameStatePayload(forPlayer: Player): KalakGameStatePayload {
    const answeredNames = Array.from(this.submittedAnswers.keys())
      .filter((sid) => !this.rejectedAnswers.has(sid))
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
        isOwn: a.playerIds.includes(forPlayer.id),
      }));
    }

    // Only show round result during REVEAL
    const roundResult = this.roundPhase === KalakRoundPhase.REVEAL
      ? this.roundHistory[this.roundHistory.length - 1] ?? null
      : null;

    // Check if this player's answer was rejected
    const answerRejected = this.rejectedAnswers.has(forPlayer.id);

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
      answerRejected,
    };
  }

  getHostDisplayPayload(): KalakHostDisplayPayload {
    const answeredNames = Array.from(this.submittedAnswers.keys())
      .filter((sid) => !this.rejectedAnswers.has(sid))
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    const votedNames = Array.from(this.votes.keys())
      .map((sid) => this.findPlayerBySocketId(sid)?.displayName)
      .filter(Boolean) as string[];

    // Host display sees full answer data (with player names) during VOTING/REVEAL
    let answers: KalakAnswer[] | null = null;
    if (this.roundPhase === KalakRoundPhase.VOTING || this.roundPhase === KalakRoundPhase.REVEAL) {
      answers = this.shuffledAnswers;
    }

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
      question: this.currentQuestion || null,
      answers,
      playersAnswered: answeredNames,
      playersVoted: votedNames,
      timerSeconds: null,
      answerCount: this.getConnectedPlayers().length,
    };
  }

  getLobbyState(): KalakLobbyStatePayload {
    return {
      gameType: GameType.KALAK,
      roomCode: this.roomCode,
      players: this.players,
      language: this.language,
      categories: this.categories,
      totalRounds: this.totalRounds,
      freeMode: this.freeMode,
      timers: this.timers,
    };
  }

  getGameOverPayload(): KalakGameOverPayload {
    const scores = this.getScoresArray();
    const winner = scores.length > 0 ? scores[0].displayName : "";
    return {
      scores,
      roundHistory: this.roundHistory,
      winner,
      awards: this.computeAwards(),
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
    this.rejectedAnswers.clear();
    this.knewCorrectAnswer.clear();
    this.shuffledAnswers = [];
    this.votes.clear();

    this.scores.clear();
    for (const p of this.players) {
      this.scores.set(p.displayName, {
        displayName: p.displayName,
        score: 0,
        correctAnswers: 0,
        timesFooledOthers: 0,
        timesGotFooled: 0,
        roundsPlayed: 0,
      });
    }
  }
}
