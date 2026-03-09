import {
  Card, CardPayload, CardType, Clue, GamePhase, GameStatePayload,
  GameStats, GameType, LogEntry, LobbyStatePayload, Player, Role, Team, TurnPhase,
} from "shared/types";
import { generateBoard } from "../utils/boardGenerator";
import { DEFAULT_TIMER_DURATION } from "../config";
import type { BaseGame } from "./BaseGame";

export class Game implements BaseGame {
  gameType: GameType = GameType.CODENAMES;
  roomCode: string;
  phase: GamePhase = GamePhase.LOBBY;
  players: Player[] = [];
  board: Card[] = [];
  currentTurn: Team = Team.RED;
  turnPhase: TurnPhase = TurnPhase.GIVING_CLUE;
  currentClue: Clue | null = null;
  guessesRemaining: number = 0;
  log: LogEntry[] = [];
  winner: Team | null = null;
  timerEnabled: boolean = false;
  timerDuration: number = DEFAULT_TIMER_DURATION;
  redRemaining: number = 0;
  blueRemaining: number = 0;
  turnsPlayed: number = 0;
  currentVotes: Map<number, Set<string>> = new Map();
  createdAt: number = Date.now();
  hostDisplaySocketId: string | null = null;

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
      avatar: null,
      joinedAtRound: null,
    };
    this.players.push(player);
    return player;
  }

  removePlayer(displayName: string): void {
    this.players = this.players.filter((p) => p.displayName !== displayName);
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

  pickTeam(socketId: string, team: Team, role: Role): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player) return false;

    // Only one spymaster per team
    if (role === Role.SPYMASTER) {
      const existingSpymaster = this.players.find(
        (p) => p.team === team && p.role === Role.SPYMASTER && p.id !== socketId
      );
      if (existingSpymaster) return false;
    }

    player.team = team;
    player.role = role;
    return true;
  }

  // ── Game Start ──

  canStart(): { ok: boolean; reason?: string } {
    const redPlayers = this.players.filter((p) => p.team === Team.RED);
    const bluePlayers = this.players.filter((p) => p.team === Team.BLUE);

    if (redPlayers.length === 0 || bluePlayers.length === 0) {
      return { ok: false, reason: "Both teams need at least one player" };
    }

    const redSpy = redPlayers.find((p) => p.role === Role.SPYMASTER);
    const blueSpy = bluePlayers.find((p) => p.role === Role.SPYMASTER);

    if (!redSpy || !blueSpy) {
      return { ok: false, reason: "Each team needs a spymaster" };
    }

    return { ok: true };
  }

  start(): void {
    this.board = generateBoard();
    this.phase = GamePhase.PLAYING;
    this.currentTurn = Team.RED;
    this.turnPhase = TurnPhase.GIVING_CLUE;
    this.currentClue = null;
    this.guessesRemaining = 0;
    this.log = [];
    this.winner = null;
    this.turnsPlayed = 0;
    this.currentVotes.clear();
    this.redRemaining = this.board.filter((c) => c.type === CardType.RED).length;
    this.blueRemaining = this.board.filter((c) => c.type === CardType.BLUE).length;
  }

  // ── Clue Giving ──

  giveClue(socketId: string, word: string, number: number): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player) return false;
    if (player.team !== this.currentTurn) return false;
    if (player.role !== Role.SPYMASTER) return false;
    if (this.turnPhase !== TurnPhase.GIVING_CLUE) return false;

    this.currentClue = {
      word,
      number,
      team: this.currentTurn,
      spymaster: player.displayName,
    };
    // Number 0 means unlimited guesses (official rules)
    this.guessesRemaining = number === 0 ? Infinity : number + 1;
    this.turnPhase = TurnPhase.GUESSING;
    this.currentVotes.clear();
    this.turnsPlayed++;

    this.log.push({
      timestamp: Date.now(),
      type: "CLUE",
      team: this.currentTurn,
      details: { clue: this.currentClue },
    });

    return true;
  }

  // ── Voting ──

  vote(socketId: string, position: number): boolean {
    const player = this.findPlayerBySocketId(socketId);
    if (!player) return false;
    if (player.team !== this.currentTurn) return false;
    if (this.turnPhase !== TurnPhase.GUESSING) return false;

    // In 1v1, spymaster can vote during guessing phase
    const isOnlyPlayer = this.getTeamOperatives(this.currentTurn).length === 0;
    if (player.role !== Role.OPERATIVE && !isOnlyPlayer) return false;

    // If voting for a specific card, validate it first before removing old vote
    if (position >= 0 && position < this.board.length) {
      if (this.board[position].revealed) return false; // can't vote on revealed cards
    }

    // Remove existing vote from this player
    for (const [pos, voters] of this.currentVotes) {
      voters.delete(player.displayName);
      if (voters.size === 0) this.currentVotes.delete(pos);
    }

    // Add new vote (position -1 means abstain/remove)
    if (position >= 0 && position < this.board.length) {
      if (!this.currentVotes.has(position)) {
        this.currentVotes.set(position, new Set());
      }
      this.currentVotes.get(position)!.add(player.displayName);
    }

    return true;
  }

  // Remove votes from a specific player (used on disconnect)
  removeVotesForPlayer(displayName: string): void {
    for (const [pos, voters] of this.currentVotes) {
      voters.delete(displayName);
      if (voters.size === 0) this.currentVotes.delete(pos);
    }
  }

  getVotesPayload(): Record<number, string[]> {
    const result: Record<number, string[]> = {};
    for (const [pos, voters] of this.currentVotes) {
      result[pos] = Array.from(voters);
    }
    return result;
  }

  getTeamOperatives(team: Team): Player[] {
    return this.players.filter(
      (p) => p.team === team && p.role === Role.OPERATIVE && p.isConnected
    );
  }

  getVoterCount(team: Team): number {
    // In 1v1, the spymaster votes too
    const operatives = this.getTeamOperatives(team);
    if (operatives.length === 0) return 1; // spymaster is the voter
    return operatives.length;
  }

  getMajorityPosition(): number | null {
    const voterCount = this.getVoterCount(this.currentTurn);
    const threshold = Math.ceil(voterCount / 2);

    for (const [pos, voters] of this.currentVotes) {
      if (voters.size >= threshold) return pos;
    }
    return null;
  }

  // ── Guessing ──

  revealCard(position: number): {
    correct: boolean;
    cardType: CardType;
    gameOver: boolean;
    winner: Team | null;
    reason?: "ASSASSIN" | "ALL_FOUND";
  } {
    const card = this.board[position];
    card.revealed = true;
    this.currentVotes.clear();

    const isCorrect = card.type === (this.currentTurn === Team.RED ? CardType.RED : CardType.BLUE);

    // Update remaining counts
    if (card.type === CardType.RED) this.redRemaining--;
    if (card.type === CardType.BLUE) this.blueRemaining--;

    // Log the guess
    this.log.push({
      timestamp: Date.now(),
      type: card.type === CardType.ASSASSIN
        ? "GUESS_ASSASSIN"
        : isCorrect
          ? "GUESS_CORRECT"
          : "GUESS_WRONG",
      team: this.currentTurn,
      details: { cardWord: card.word, cardType: card.type },
    });

    // Check assassin
    if (card.type === CardType.ASSASSIN) {
      this.winner = this.currentTurn === Team.RED ? Team.BLUE : Team.RED;
      this.phase = GamePhase.GAME_OVER;
      return { correct: false, cardType: card.type, gameOver: true, winner: this.winner, reason: "ASSASSIN" };
    }

    // Check if a team found all their cards
    if (this.redRemaining === 0) {
      this.winner = Team.RED;
      this.phase = GamePhase.GAME_OVER;
      return { correct: isCorrect, cardType: card.type, gameOver: true, winner: Team.RED, reason: "ALL_FOUND" };
    }
    if (this.blueRemaining === 0) {
      this.winner = Team.BLUE;
      this.phase = GamePhase.GAME_OVER;
      return { correct: isCorrect, cardType: card.type, gameOver: true, winner: Team.BLUE, reason: "ALL_FOUND" };
    }

    // If wrong guess, end turn
    if (!isCorrect) {
      this.endTurn();
      return { correct: false, cardType: card.type, gameOver: false, winner: null };
    }

    // Correct guess — decrement remaining guesses
    this.guessesRemaining--;
    if (this.guessesRemaining <= 0) {
      this.endTurn();
    }

    return { correct: true, cardType: card.type, gameOver: false, winner: null };
  }

  passTurn(): void {
    this.log.push({
      timestamp: Date.now(),
      type: "PASS",
      team: this.currentTurn,
      details: {},
    });
    this.endTurn();
  }

  endTurn(): void {
    this.currentTurn = this.currentTurn === Team.RED ? Team.BLUE : Team.RED;
    this.turnPhase = TurnPhase.GIVING_CLUE;
    this.currentClue = null;
    this.guessesRemaining = 0;
    this.currentVotes.clear();
  }

  // ── State Serialization ──

  getGameStatePayload(forPlayer: Player): GameStatePayload {
    const isSpymaster = forPlayer.role === Role.SPYMASTER;
    // In 1v1, hide card types during own team's guessing phase
    const hideTypes = isSpymaster
      && forPlayer.team === this.currentTurn
      && this.turnPhase === TurnPhase.GUESSING
      && this.getTeamOperatives(this.currentTurn).length === 0;

    const votesMap = this.getVotesPayload();
    const board: CardPayload[] = this.board.map((card) => ({
      word: card.word,
      type: (isSpymaster && !hideTypes) || card.revealed ? card.type : undefined,
      revealed: card.revealed,
      position: card.position,
      votes: votesMap[card.position] || [],
    }));

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      players: this.players,
      board,
      currentTurn: this.currentTurn,
      turnPhase: this.turnPhase,
      currentClue: this.currentClue,
      guessesRemaining: this.guessesRemaining,
      log: this.log,
      winner: this.winner,
      redRemaining: this.redRemaining,
      blueRemaining: this.blueRemaining,
      timerEnabled: this.timerEnabled,
      timerDuration: this.timerDuration,
    };
  }

  getLobbyState(): LobbyStatePayload {
    return {
      players: this.players,
      timerEnabled: this.timerEnabled,
      timerDuration: this.timerDuration,
    };
  }

  getStats(): GameStats {
    return {
      turnsPlayed: this.turnsPlayed,
      redRemaining: this.redRemaining,
      blueRemaining: this.blueRemaining,
      assassinHitBy: this.log.find((e) => e.type === "GUESS_ASSASSIN")?.team ?? null,
    };
  }

  // ── Rematch ──

  rematch(): void {
    this.board = generateBoard();
    this.phase = GamePhase.PLAYING;
    this.currentTurn = Team.RED;
    this.turnPhase = TurnPhase.GIVING_CLUE;
    this.currentClue = null;
    this.guessesRemaining = 0;
    this.log = [];
    this.winner = null;
    this.turnsPlayed = 0;
    this.currentVotes.clear();
    this.redRemaining = this.board.filter((c) => c.type === CardType.RED).length;
    this.blueRemaining = this.board.filter((c) => c.type === CardType.BLUE).length;
  }
}
