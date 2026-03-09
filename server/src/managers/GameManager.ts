import { GameType } from "shared/types";
import { Game } from "../models/Game";
import { KalakGame } from "../models/KalakGame";
import type { BaseGame } from "../models/BaseGame";
import { generateRoomCode } from "../utils/roomCode";

export class GameManager {
  private games: Map<string, BaseGame> = new Map();

  createGame(hostSocketId: string, hostName: string, gameType: GameType = GameType.CODENAMES): BaseGame {
    const existingCodes = new Set(this.games.keys());
    const roomCode = generateRoomCode(existingCodes);
    const game = gameType === GameType.KALAK
      ? new KalakGame(roomCode)
      : new Game(roomCode);
    game.addPlayer(hostSocketId, hostName, true);
    this.games.set(roomCode, game);
    console.log(`Game created: ${roomCode} (${gameType}) by ${hostName}`);
    return game;
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

  findGameBySocketId(socketId: string): BaseGame | undefined {
    for (const game of this.games.values()) {
      if (game.findPlayerBySocketId(socketId)) return game;
    }
    return undefined;
  }

  findGameByPlayerName(displayName: string): BaseGame | undefined {
    for (const game of this.games.values()) {
      if (game.findPlayerByName(displayName)) return game;
    }
    return undefined;
  }

  removeGame(roomCode: string): void {
    this.games.delete(roomCode);
    console.log(`Game removed: ${roomCode}`);
  }

  getActiveGameCount(): number {
    return this.games.size;
  }
}
