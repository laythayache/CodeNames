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

// ── Interfaces ──

export interface Player {
  id: string;
  displayName: string;
  team: Team | null;
  role: Role | null;
  isHost: boolean;
  isConnected: boolean;
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
  players: Player[];
  timerEnabled: boolean;
  timerDuration: number;
}

// ── Socket Event Payloads ──

export interface CreateRoomPayload {
  displayName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
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
