import { Game } from "../models/Game";
import { generateRoomCode } from "../utils/roomCode";

export class GameManager {
  private games: Map<string, Game> = new Map();

  createGame(hostSocketId: string, hostName: string): Game {
    const existingCodes = new Set(this.games.keys());
    const roomCode = generateRoomCode(existingCodes);
    const game = new Game(roomCode);
    game.addPlayer(hostSocketId, hostName, true);
    this.games.set(roomCode, game);
    console.log(`Game created: ${roomCode} by ${hostName}`);
    return game;
  }

  getGame(roomCode: string): Game | undefined {
    return this.games.get(roomCode.toUpperCase());
  }

  findGameBySocketId(socketId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.findPlayerBySocketId(socketId)) return game;
    }
    return undefined;
  }

  findGameByPlayerName(displayName: string): Game | undefined {
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
