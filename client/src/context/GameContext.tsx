import { createContext, useContext, useReducer, type ReactNode } from "react";
import {
  type GameStatePayload, type LobbyStatePayload, type GameOverPayload,
  type VotesUpdatedPayload, type KalakGameStatePayload, type KalakLobbyStatePayload,
  type KalakGameOverPayload, type KalakRoundResult, type KalakHostDisplayPayload,
  type KalakPlayerScore, type CodenamesHostDisplayPayload,
  type GwdwGameStatePayload, type GwdwLobbyStatePayload, type GwdwGameOverPayload,
  type GwdwHostDisplayPayload, type GwdwRoundResult, type GwdwAnswerResult,
  GamePhase, GameType, TurnPhase, Team,
} from "shared/types";

interface GameState {
  gameType: GameType | null;
  // Codenames
  gameState: GameStatePayload | null;
  lobbyState: LobbyStatePayload | null;
  gameOver: GameOverPayload | null;
  votes: Record<number, string[]>;
  // Kalak
  kalakState: KalakGameStatePayload | null;
  kalakLobbyState: KalakLobbyStatePayload | null;
  kalakGameOver: KalakGameOverPayload | null;
  kalakRoundResult: KalakRoundResult | null;
  kalakHostDisplay: KalakHostDisplayPayload | null;
  kalakLoading: boolean;
  kalakLeaderboard: KalakPlayerScore[] | null;
  kalakAnswerRejected: boolean;
  // Codenames host display
  codenamesHostDisplay: CodenamesHostDisplayPayload | null;
  // GWDW
  gwdwState: GwdwGameStatePayload | null;
  gwdwLobbyState: GwdwLobbyStatePayload | null;
  gwdwGameOver: GwdwGameOverPayload | null;
  gwdwHostDisplay: GwdwHostDisplayPayload | null;
  gwdwRoundResult: GwdwRoundResult | null;
  gwdwAnswerResult: GwdwAnswerResult | null;
  gwdwLoading: boolean;
  // Shared
  timerSeconds: number | null;
  kicked: boolean;
}

type GameAction =
  | { type: "SET_GAME_TYPE"; payload: GameType }
  | { type: "SET_GAME_STATE"; payload: GameStatePayload }
  | { type: "SET_LOBBY_STATE"; payload: LobbyStatePayload }
  | { type: "SET_GAME_OVER"; payload: GameOverPayload }
  | { type: "SET_VOTES"; payload: VotesUpdatedPayload }
  | { type: "SET_KALAK_GAME_STATE"; payload: KalakGameStatePayload }
  | { type: "SET_KALAK_LOBBY_STATE"; payload: KalakLobbyStatePayload }
  | { type: "SET_KALAK_GAME_OVER"; payload: KalakGameOverPayload }
  | { type: "SET_KALAK_ROUND_RESULT"; payload: KalakRoundResult }
  | { type: "SET_KALAK_HOST_DISPLAY"; payload: KalakHostDisplayPayload }
  | { type: "SET_KALAK_LOADING"; payload: boolean }
  | { type: "SET_KALAK_LEADERBOARD"; payload: KalakPlayerScore[] }
  | { type: "SET_KALAK_ANSWER_REJECTED"; payload: boolean }
  | { type: "SET_KALAK_PLAYERS_ANSWERED"; payload: string }
  | { type: "SET_KALAK_PLAYERS_VOTED"; payload: string }
  | { type: "SET_CODENAMES_HOST_DISPLAY"; payload: CodenamesHostDisplayPayload }
  | { type: "SET_GWDW_GAME_STATE"; payload: GwdwGameStatePayload }
  | { type: "SET_GWDW_LOBBY_STATE"; payload: GwdwLobbyStatePayload }
  | { type: "SET_GWDW_GAME_OVER"; payload: GwdwGameOverPayload }
  | { type: "SET_GWDW_HOST_DISPLAY"; payload: GwdwHostDisplayPayload }
  | { type: "SET_GWDW_ROUND_RESULT"; payload: GwdwRoundResult }
  | { type: "SET_GWDW_ANSWER_RESULT"; payload: GwdwAnswerResult }
  | { type: "SET_GWDW_LOADING"; payload: boolean }
  | { type: "SET_GWDW_PLAYER_ANSWERED"; payload: string }
  | { type: "SET_GWDW_PLAYER_VOTED"; payload: string }
  | { type: "SET_TIMER"; payload: number }
  | { type: "TIMER_EXPIRED" }
  | { type: "KICKED" }
  | { type: "RESET" };

const initialState: GameState = {
  gameType: null,
  gameState: null,
  lobbyState: null,
  gameOver: null,
  votes: {},
  kalakState: null,
  kalakLobbyState: null,
  kalakGameOver: null,
  kalakRoundResult: null,
  kalakHostDisplay: null,
  kalakLoading: false,
  kalakLeaderboard: null,
  kalakAnswerRejected: false,
  codenamesHostDisplay: null,
  gwdwState: null,
  gwdwLobbyState: null,
  gwdwGameOver: null,
  gwdwHostDisplay: null,
  gwdwRoundResult: null,
  gwdwAnswerResult: null,
  gwdwLoading: false,
  timerSeconds: null,
  kicked: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_GAME_TYPE":
      return { ...state, gameType: action.payload };
    case "SET_GAME_STATE": {
      const turnChanged = state.gameState &&
        (state.gameState.currentTurn !== action.payload.currentTurn ||
         state.gameState.turnPhase !== action.payload.turnPhase);
      return { ...state, gameState: action.payload, votes: turnChanged ? {} : state.votes };
    }
    case "SET_LOBBY_STATE":
      return { ...state, lobbyState: action.payload, gameOver: null, codenamesHostDisplay: null, gameState: null };
    case "SET_GAME_OVER":
      return { ...state, gameOver: action.payload };
    case "SET_VOTES":
      return { ...state, votes: action.payload.votes };
    case "SET_KALAK_GAME_STATE":
      return {
        ...state,
        kalakState: action.payload,
        kalakGameOver: null,
        kalakRoundResult: null,
        kalakLoading: false,
        // Sync rejection state from server (source of truth)
        kalakAnswerRejected: action.payload.answerRejected,
      };
    case "SET_KALAK_LOBBY_STATE":
      return {
        ...state,
        kalakLobbyState: action.payload,
        kalakGameOver: null,
        kalakState: null,
        kalakHostDisplay: null,
        kalakLeaderboard: null,
        kalakRoundResult: null,
        kalakLoading: false,
      };
    case "SET_KALAK_GAME_OVER":
      return { ...state, kalakGameOver: action.payload, kalakLeaderboard: null };
    case "SET_KALAK_ROUND_RESULT":
      return { ...state, kalakRoundResult: action.payload };
    case "SET_KALAK_HOST_DISPLAY":
      return { ...state, kalakHostDisplay: action.payload };
    case "SET_KALAK_LOADING":
      return {
        ...state,
        kalakLoading: action.payload,
        // Clear lobby state so host display routing doesn't stay on lobby page
        ...(action.payload ? { kalakLobbyState: null } : {}),
      };
    case "SET_KALAK_LEADERBOARD":
      return { ...state, kalakLeaderboard: action.payload };
    case "SET_KALAK_ANSWER_REJECTED":
      return { ...state, kalakAnswerRejected: action.payload };
    case "SET_KALAK_PLAYERS_ANSWERED": {
      const name = action.payload;
      let next = state;
      // Update host display
      if (next.kalakHostDisplay && !next.kalakHostDisplay.playersAnswered.includes(name)) {
        next = { ...next, kalakHostDisplay: { ...next.kalakHostDisplay, playersAnswered: [...next.kalakHostDisplay.playersAnswered, name] } };
      }
      // Update player state
      if (next.kalakState && !next.kalakState.playersAnswered.includes(name)) {
        next = { ...next, kalakState: { ...next.kalakState, playersAnswered: [...next.kalakState.playersAnswered, name] } };
      }
      return next;
    }
    case "SET_KALAK_PLAYERS_VOTED": {
      const name = action.payload;
      let next = state;
      if (next.kalakHostDisplay && !next.kalakHostDisplay.playersVoted.includes(name)) {
        next = { ...next, kalakHostDisplay: { ...next.kalakHostDisplay, playersVoted: [...next.kalakHostDisplay.playersVoted, name] } };
      }
      if (next.kalakState && !next.kalakState.playersVoted.includes(name)) {
        next = { ...next, kalakState: { ...next.kalakState, playersVoted: [...next.kalakState.playersVoted, name] } };
      }
      return next;
    }
    case "SET_CODENAMES_HOST_DISPLAY":
      return { ...state, codenamesHostDisplay: action.payload };
    case "SET_GWDW_GAME_STATE":
      return {
        ...state,
        gwdwState: action.payload,
        gwdwGameOver: null,
        gwdwRoundResult: null,
        gwdwAnswerResult: null,
        gwdwLoading: false,
      };
    case "SET_GWDW_LOBBY_STATE":
      return {
        ...state,
        gwdwLobbyState: action.payload,
        gwdwGameOver: null,
        gwdwState: null,
        gwdwHostDisplay: null,
        gwdwRoundResult: null,
        gwdwAnswerResult: null,
        gwdwLoading: false,
      };
    case "SET_GWDW_GAME_OVER":
      return { ...state, gwdwGameOver: action.payload };
    case "SET_GWDW_HOST_DISPLAY":
      return { ...state, gwdwHostDisplay: action.payload };
    case "SET_GWDW_ROUND_RESULT":
      return { ...state, gwdwRoundResult: action.payload };
    case "SET_GWDW_ANSWER_RESULT":
      return { ...state, gwdwAnswerResult: action.payload };
    case "SET_GWDW_LOADING":
      return {
        ...state,
        gwdwLoading: action.payload,
        ...(action.payload ? { gwdwLobbyState: null } : {}),
      };
    case "SET_GWDW_PLAYER_ANSWERED": {
      const name = action.payload;
      let next = state;
      if (next.gwdwHostDisplay && !next.gwdwHostDisplay.playersAnswered.includes(name)) {
        next = { ...next, gwdwHostDisplay: { ...next.gwdwHostDisplay, playersAnswered: [...next.gwdwHostDisplay.playersAnswered, name] } };
      }
      if (next.gwdwState && !next.gwdwState.playersAnswered.includes(name)) {
        next = { ...next, gwdwState: { ...next.gwdwState, playersAnswered: [...next.gwdwState.playersAnswered, name] } };
      }
      return next;
    }
    case "SET_GWDW_PLAYER_VOTED": {
      const name = action.payload;
      let next = state;
      if (next.gwdwHostDisplay && !next.gwdwHostDisplay.currentVoters.includes(name)) {
        next = { ...next, gwdwHostDisplay: { ...next.gwdwHostDisplay, currentVoters: [...next.gwdwHostDisplay.currentVoters, name] } };
      }
      if (next.gwdwState && !next.gwdwState.currentVoters.includes(name)) {
        next = { ...next, gwdwState: { ...next.gwdwState, currentVoters: [...next.gwdwState.currentVoters, name] } };
      }
      return next;
    }
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
  if (state.gameType === GameType.KALAK) {
    return state.kalakState?.phase ?? (state.kalakLobbyState ? GamePhase.LOBBY : null);
  }
  if (state.gameType === GameType.GWDW) {
    return state.gwdwState?.phase ?? (state.gwdwLobbyState ? GamePhase.LOBBY : null);
  }
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
