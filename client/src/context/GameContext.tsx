import { createContext, useContext, useReducer, type ReactNode } from "react";
import {
  type GameStatePayload, type LobbyStatePayload, type GameOverPayload,
  type VotesUpdatedPayload, GamePhase, TurnPhase, Team,
} from "shared/types";

interface GameState {
  gameState: GameStatePayload | null;
  lobbyState: LobbyStatePayload | null;
  gameOver: GameOverPayload | null;
  votes: Record<number, string[]>;
  timerSeconds: number | null;
  kicked: boolean;
}

type GameAction =
  | { type: "SET_GAME_STATE"; payload: GameStatePayload }
  | { type: "SET_LOBBY_STATE"; payload: LobbyStatePayload }
  | { type: "SET_GAME_OVER"; payload: GameOverPayload }
  | { type: "SET_VOTES"; payload: VotesUpdatedPayload }
  | { type: "SET_TIMER"; payload: number }
  | { type: "TIMER_EXPIRED" }
  | { type: "KICKED" }
  | { type: "RESET" };

const initialState: GameState = {
  gameState: null,
  lobbyState: null,
  gameOver: null,
  votes: {},
  timerSeconds: null,
  kicked: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_GAME_STATE": {
      // Only reset votes if the turn or phase changed (not on every state broadcast)
      const turnChanged = state.gameState &&
        (state.gameState.currentTurn !== action.payload.currentTurn ||
         state.gameState.turnPhase !== action.payload.turnPhase);
      return { ...state, gameState: action.payload, votes: turnChanged ? {} : state.votes };
    }
    case "SET_LOBBY_STATE":
      return { ...state, lobbyState: action.payload };
    case "SET_GAME_OVER":
      return { ...state, gameOver: action.payload };
    case "SET_VOTES":
      return { ...state, votes: action.payload.votes };
    case "SET_TIMER":
      return { ...state, timerSeconds: action.payload };
    case "TIMER_EXPIRED":
      return { ...state, timerSeconds: null };
    case "KICKED":
      return { ...state, kicked: true };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

// Convenience selectors
export function useGamePhase(): GamePhase | null {
  const { state } = useGame();
  return state.gameState?.phase ?? (state.lobbyState ? GamePhase.LOBBY : null);
}

export function useIsMyTurn(myTeam: Team | null): boolean {
  const { state } = useGame();
  if (!state.gameState || !myTeam) return false;
  return state.gameState.currentTurn === myTeam && state.gameState.phase === GamePhase.PLAYING;
}

export function useTurnPhase(): TurnPhase | null {
  const { state } = useGame();
  return state.gameState?.turnPhase ?? null;
}
