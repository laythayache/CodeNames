import { GamePhase, GameType, Player } from "shared/types";

export interface BaseGame {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  createdAt: number;
  gameType: GameType;

  addPlayer(id: string, displayName: string, isHost: boolean): Player;
  removePlayer(displayName: string): void;
  findPlayerBySocketId(socketId: string): Player | undefined;
  findPlayerByName(displayName: string): Player | undefined;
  isNameTaken(displayName: string): boolean;
  removeVotesForPlayer(displayName: string): void;
  getLobbyState(): unknown;
}
