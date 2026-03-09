// ── Enums ──

export enum Team {
  RED = "RED",
  BLUE = "BLUE",
}

export enum Role {
  SPYMASTER = "SPYMASTER",
  OPERATIVE = "OPERATIVE",
}

export enum CardType {
  RED = "RED",
  BLUE = "BLUE",
  NEUTRAL = "NEUTRAL",
  ASSASSIN = "ASSASSIN",
}

export enum GamePhase {
  LOBBY = "LOBBY",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
}

export enum TurnPhase {
  GIVING_CLUE = "GIVING_CLUE",
  GUESSING = "GUESSING",
}

// ── Avatar ──

export interface Avatar {
  eyes: number;      // 0-9
  hair: number;      // 0-9
  eyebrows: number;  // 0-9
  mouth: number;     // 0-9
  nose: number;      // 0-9
  skinColor: number; // 0-5
  hairColor: number; // 0-7
}

// ── Interfaces ──

export interface Player {
  id: string;
  displayName: string;
  team: Team | null;
  role: Role | null;
  isHost: boolean;
  isConnected: boolean;
  avatar: Avatar | null;
  joinedAtRound: number | null; // for mid-game join tracking
}

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
  position: number;
  votes: string[];
}

export interface CardPayload {
  word: string;
  type?: CardType; // only present for spymasters
  revealed: boolean;
  position: number;
  votes: string[];
}

export interface Clue {
  word: string;
  number: number;
  team: Team;
  spymaster: string;
}

export interface LogEntry {
  timestamp: number;
  type: "CLUE" | "GUESS_CORRECT" | "GUESS_WRONG" | "GUESS_ASSASSIN" | "PASS" | "TIMER_EXPIRED";
  team: Team;
  details: {
    clue?: Clue;
    cardWord?: string;
    cardType?: CardType;
    playerName?: string;
  };
}

export interface GameStats {
  turnsPlayed: number;
  redRemaining: number;
  blueRemaining: number;
  assassinHitBy: Team | null;
}

export interface GameStatePayload {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  board: CardPayload[];
  currentTurn: Team;
  turnPhase: TurnPhase;
  currentClue: Clue | null;
  guessesRemaining: number;
  log: LogEntry[];
  winner: Team | null;
  redRemaining: number;
  blueRemaining: number;
  timerEnabled: boolean;
  timerDuration: number;
}

export interface LobbyStatePayload {
  roomCode: string;
  players: Player[];
  timerEnabled: boolean;
  timerDuration: number;
}

export interface CodenamesHostDisplayPayload {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  board: CardPayload[];  // all types visible (spymaster view)
  currentTurn: Team;
  turnPhase: TurnPhase;
  currentClue: Clue | null;
  guessesRemaining: number;
  log: LogEntry[];
  winner: Team | null;
  redRemaining: number;
  blueRemaining: number;
  timerEnabled: boolean;
  timerDuration: number;
  votes: Record<number, string[]>;
}

// ── Socket Event Payloads ──

export interface CreateRoomPayload {
  gameType: GameType;
}

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  avatar: Avatar;
}

export interface PickTeamPayload {
  team: Team;
  role: Role;
}

export interface UpdateSettingsPayload {
  timerEnabled: boolean;
  timerDuration: number;
}

export interface GiveCluePayload {
  word: string;
  number: number;
}

export interface VoteCardPayload {
  position: number; // -1 to remove vote
}

export interface ConfirmGuessPayload {
  position: number;
}

export interface KickPlayerPayload {
  displayName: string;
}

export interface VotesUpdatedPayload {
  votes: Record<number, string[]>;
}

export interface CardRevealedPayload {
  position: number;
  cardType: CardType;
}

export interface TurnResultPayload {
  correct: boolean;
  cardType: CardType;
  guessesRemaining: number;
  turnPhase: TurnPhase;
  currentTurn: Team;
}

export interface GameOverPayload {
  winner: Team | null;
  reason: "ASSASSIN" | "ALL_FOUND" | "FORCE_END";
  board: Card[];
  stats: GameStats;
}

export interface ErrorPayload {
  message: string;
}

// ── Game Type ──

export enum GameType {
  CODENAMES = "CODENAMES",
  KALAK = "KALAK",
}

// ── Kalak Enums ──

export enum KalakLanguage {
  ENGLISH = "ENGLISH",
  ARABIC = "ARABIC",
}

export enum KalakRoundPhase {
  QUESTION = "QUESTION",
  ANSWERING = "ANSWERING",
  VOTING = "VOTING",
  REVEAL = "REVEAL",
}

// ── Kalak Timer Config ──

export interface KalakTimerConfig {
  questionDisplay: number;  // seconds to show question (0 = skip)
  answering: number;        // seconds for answering (0 = no timer, wait for all)
  voting: number;           // seconds for voting (0 = no timer, wait for all)
  reveal: number;           // seconds to show reveal
  leaderboard: number;      // seconds to show leaderboard (every 5 rounds)
}

export const DEFAULT_KALAK_TIMERS: KalakTimerConfig = {
  questionDisplay: 3,
  answering: 60,
  voting: 30,
  reveal: 8,
  leaderboard: 10,
};

// ── Kalak Interfaces ──

export interface KalakAnswer {
  id: string;            // unique ID for voting reference
  text: string;
  playerIds: string[];   // multiple players can share merged answer; "CORRECT" for real
  playerNames: string[]; // display names of authors; empty for correct answer
}

export interface KalakVote {
  voterId: string;
  voterName: string;
  answerId: string;  // id of the answer they voted for
}

export interface KalakScoreDelta {
  correct: number;   // +2 if voted correctly
  fooled: number;    // +1 per player fooled
  total: number;
}

export interface KalakRoundResult {
  roundNumber: number;
  question: string;
  correctAnswer: string;
  answers: KalakAnswer[];
  votes: KalakVote[];
  scoreDeltas: Record<string, KalakScoreDelta>; // keyed by displayName
  didntAnswer: string[];  // display names who didn't answer
  didntVote: string[];    // display names who didn't vote
  knewCorrectAnswer: string[]; // display names who guessed correct and re-submitted
}

export interface KalakPlayerScore {
  displayName: string;
  score: number;
  correctAnswers: number;
  timesFooledOthers: number;
  timesGotFooled: number;
  roundsPlayed: number;
}

// ── Kalak Special Awards ──

export interface KalakAward {
  title: string;
  titleAr: string;
  playerName: string;
  value: string;
  emoji: string;
}

// ── Kalak Payloads ──

export interface KalakGameStatePayload {
  roomCode: string;
  gameType: GameType.KALAK;
  phase: GamePhase;
  roundPhase: KalakRoundPhase;
  players: Player[];
  scores: KalakPlayerScore[];
  currentRound: number;
  totalRounds: number;
  language: KalakLanguage;
  categories: string[];
  question: string | null;
  // Voting phase: shuffled answers (own answer marked)
  answers: { id: string; text: string; isOwn: boolean }[] | null;
  playersAnswered: string[];  // displayNames who submitted
  playersVoted: string[];     // displayNames who voted
  roundResult: KalakRoundResult | null;
  timerSeconds: number | null;
  // Answer rejection: server tells player they found the correct answer
  answerRejected: boolean;
}

export interface KalakLobbyStatePayload {
  gameType: GameType.KALAK;
  roomCode: string;
  players: Player[];
  language: KalakLanguage;
  categories: string[];
  totalRounds: number;
  freeMode: boolean;
  timers: KalakTimerConfig;
}

export interface KalakGameOverPayload {
  scores: KalakPlayerScore[];
  roundHistory: KalakRoundResult[];
  winner: string; // displayName
  awards: KalakAward[];
}

// ── Kalak Host Display Payloads ──

export interface KalakHostDisplayPayload {
  roomCode: string;
  phase: GamePhase;
  roundPhase: KalakRoundPhase;
  players: Player[];
  scores: KalakPlayerScore[];
  currentRound: number;
  totalRounds: number;
  language: KalakLanguage;
  categories: string[];
  question: string | null;
  answers: KalakAnswer[] | null;   // full answers with player names (host sees all)
  playersAnswered: string[];
  playersVoted: string[];
  timerSeconds: number | null;
  answerCount: number;             // total connected players
}

// ── Kalak Socket Payloads ──

export interface KalakUpdateSettingsPayload {
  language: KalakLanguage;
  categories: string[];
  totalRounds: number;
  freeMode: boolean;
  timers: KalakTimerConfig;
}

export interface KalakSubmitAnswerPayload {
  answer: string;
}

export interface KalakVotePayload {
  answerId: string;
}

// ── JWT ──

export interface JwtPayload {
  playerId: string;     // persistent player ID (UUID)
  displayName: string;
  roomCode: string;
  avatar: Avatar;
}
