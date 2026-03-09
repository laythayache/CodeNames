import { Avatar, GamePhase, GameType, Player } from "shared/types";

export interface BaseGame {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  createdAt: number;
  gameType: GameType;
  hostDisplaySocketId: string | null;

  addPlayer(id: string, displayName: string, isHost: boolean, avatar?: Avatar | null): Player;
  removePlayer(displayName: string): void;
  findPlayerBySocketId(socketId: string): Player | undefined;
  findPlayerByName(displayName: string): Player | undefined;
  isNameTaken(displayName: string): boolean;
  removeVotesForPlayer(displayName: string): void;
  getLobbyState(): unknown;
}
