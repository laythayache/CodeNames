import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Team, Role } from "shared/types";

interface PlayerState {
  displayName: string;
  roomCode: string;
  team: Team | null;
  role: Role | null;
  isHost: boolean;
}

interface PlayerContextValue extends PlayerState {
  setDisplayName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setTeamAndRole: (team: Team | null, role: Role | null) => void;
  setIsHost: (isHost: boolean) => void;
  reset: () => void;
}

const defaultState: PlayerState = {
  displayName: "",
  roomCode: "",
  team: null,
  role: null,
  isHost: false,
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(() => ({
    ...defaultState,
    displayName: sessionStorage.getItem("codenames:displayName") || "",
    roomCode: sessionStorage.getItem("codenames:roomCode") || "",
  }));

  const setDisplayName = useCallback((name: string) => {
    sessionStorage.setItem("codenames:displayName", name);
    setState((s) => ({ ...s, displayName: name }));
  }, []);

  const setRoomCode = useCallback((code: string) => {
    sessionStorage.setItem("codenames:roomCode", code);
    setState((s) => ({ ...s, roomCode: code }));
  }, []);

  const setTeamAndRole = useCallback((team: Team | null, role: Role | null) => {
    setState((s) => ({ ...s, team, role }));
  }, []);

  const setIsHost = useCallback((isHost: boolean) => {
    setState((s) => ({ ...s, isHost }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem("codenames:displayName");
    sessionStorage.removeItem("codenames:roomCode");
    setState(defaultState);
  }, []);

  return (
    <PlayerContext.Provider
      value={{ ...state, setDisplayName, setRoomCode, setTeamAndRole, setIsHost, reset }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
