import { GameType } from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import { GwdwGame } from "../models/GwdwGame";
import type { BaseGame } from "../models/BaseGame";
import { generateRoomCode } from "../utils/roomCode";

export class GameManager {
  private games: Map<string, BaseGame> = new Map();

  // Track host display socket → room mapping
  private hostDisplaySockets: Map<string, string> = new Map(); // socketId → roomCode

  /**
   * Create a Kalak game with host display (laptop is NOT a player).
   */
  createKalakRoom(hostDisplaySocketId: string): KalakGame {
    const existingCodes = new Set(this.games.keys());
    const roomCode = generateRoomCode(existingCodes);
    const game = new KalakGame(roomCode);
    game.hostDisplaySocketId = hostDisplaySocketId;
    this.games.set(roomCode, game);
    this.hostDisplaySockets.set(hostDisplaySocketId, roomCode);
    console.log(`Kalak room created: ${roomCode} (host display: ${hostDisplaySocketId})`);
    return game;
  }

  /**
   * Create a Codenames game with host display (laptop is NOT a player).
   */
  createCodenamesRoom(hostDisplaySocketId: string): Game {
    const existingCodes = new Set(this.games.keys());
    const roomCode = generateRoomCode(existingCodes);
    const game = new Game(roomCode);
    game.hostDisplaySocketId = hostDisplaySocketId;
    this.games.set(roomCode, game);
    this.hostDisplaySockets.set(hostDisplaySocketId, roomCode);
    console.log(`Codenames room created: ${roomCode} (host display: ${hostDisplaySocketId})`);
    return game;
  }

  /**
   * Create a GWDW game with host display (laptop is NOT a player).
   */
  createGwdwRoom(hostDisplaySocketId: string): GwdwGame {
    const existingCodes = new Set(this.games.keys());
    const roomCode = generateRoomCode(existingCodes);
    const game = new GwdwGame(roomCode);
    game.hostDisplaySocketId = hostDisplaySocketId;
    this.games.set(roomCode, game);
    this.hostDisplaySockets.set(hostDisplaySocketId, roomCode);
    console.log(`GWDW room created: ${roomCode} (host display: ${hostDisplaySocketId})`);
    return game;
  }

  /**
   * Legacy createGame for backward compatibility.
   */
  createGame(hostSocketId: string, _hostName: string, gameType: GameType = GameType.CODENAMES): BaseGame {
    if (gameType === GameType.KALAK) return this.createKalakRoom(hostSocketId);
    if (gameType === GameType.GWDW) return this.createGwdwRoom(hostSocketId);
    return this.createCodenamesRoom(hostSocketId);
  }

  getGame(roomCode: string): BaseGame | undefined {
    return this.games.get(roomCode.toUpperCase());
  }

  getCodenamesGame(roomCode: string): Game | undefined {
    const game = this.getGame(roomCode);
    return game?.gameType === GameType.CODENAMES ? game as Game : undefined;
  }

  getKalakGame(roomCode: string): KalakGame | undefined {
    const game = this.getGame(roomCode);
    return game?.gameType === GameType.KALAK ? game as KalakGame : undefined;
  }

  getGwdwGame(roomCode: string): GwdwGame | undefined {
    const game = this.getGame(roomCode);
    return game?.gameType === GameType.GWDW ? game as GwdwGame : undefined;
  }

  findGameBySocketId(socketId: string): BaseGame | undefined {
    // Check players
    for (const game of this.games.values()) {
      if (game.findPlayerBySocketId(socketId)) return game;
    }
    return undefined;
  }

  findGameByHostDisplaySocket(socketId: string): BaseGame | undefined {
    const roomCode = this.hostDisplaySockets.get(socketId);
    if (roomCode) return this.games.get(roomCode);
    return undefined;
  }

  isHostDisplay(socketId: string): boolean {
    return this.hostDisplaySockets.has(socketId);
  }

  removeHostDisplaySocket(socketId: string): void {
    this.hostDisplaySockets.delete(socketId);
  }

  findGameByPlayerName(displayName: string): BaseGame | undefined {
    for (const game of this.games.values()) {
      if (game.findPlayerByName(displayName)) return game;
    }
    return undefined;
  }

  removeGame(roomCode: string): void {
    const game = this.games.get(roomCode);
    if (game?.hostDisplaySocketId) {
      this.hostDisplaySockets.delete(game.hostDisplaySocketId);
    }
    this.games.delete(roomCode);
    console.log(`Game removed: ${roomCode}`);
  }

  getActiveGameCount(): number {
    return this.games.size;
  }
}
