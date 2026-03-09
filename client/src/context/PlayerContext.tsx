import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { GameType, type Team, type Role, type Avatar } from "shared/types";

interface PlayerState {
  displayName: string;
  roomCode: string;
  team: Team | null;
  role: Role | null;
  isHost: boolean;
  gameType: GameType | null;
  avatar: Avatar | null;
  token: string | null;
  isHostDisplay: boolean;
}

interface PlayerContextValue extends PlayerState {
  setDisplayName: (name: string) => void;
  setRoomCode: (code: string) => void;
  setTeamAndRole: (team: Team | null, role: Role | null) => void;
  setIsHost: (isHost: boolean) => void;
  setGameType: (gameType: GameType) => void;
  setAvatar: (avatar: Avatar) => void;
  setToken: (token: string) => void;
  setIsHostDisplay: (isHostDisplay: boolean) => void;
  reset: () => void;
}

const defaultState: PlayerState = {
  displayName: "",
  roomCode: "",
  team: null,
  role: null,
  isHost: false,
  gameType: null,
  avatar: null,
  token: null,
  isHostDisplay: false,
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(() => {
    const savedAvatar = localStorage.getItem("codenames:avatar");
    return {
      ...defaultState,
      displayName: localStorage.getItem("codenames:displayName") || "",
      roomCode: localStorage.getItem("codenames:roomCode") || "",
      gameType: (localStorage.getItem("codenames:gameType") as GameType) || null,
      token: localStorage.getItem("codenames:token") || null,
      avatar: savedAvatar ? JSON.parse(savedAvatar) : null,
    };
  });

  const setDisplayName = useCallback((name: string) => {
    localStorage.setItem("codenames:displayName", name);
    setState((s) => ({ ...s, displayName: name }));
  }, []);

  const setRoomCode = useCallback((code: string) => {
    localStorage.setItem("codenames:roomCode", code);
    setState((s) => ({ ...s, roomCode: code }));
  }, []);

  const setTeamAndRole = useCallback((team: Team | null, role: Role | null) => {
    setState((s) => ({ ...s, team, role }));
  }, []);

  const setIsHost = useCallback((isHost: boolean) => {
    setState((s) => ({ ...s, isHost }));
  }, []);

  const setGameType = useCallback((gameType: GameType) => {
    localStorage.setItem("codenames:gameType", gameType);
    setState((s) => ({ ...s, gameType }));
  }, []);

  const setAvatar = useCallback((avatar: Avatar) => {
    localStorage.setItem("codenames:avatar", JSON.stringify(avatar));
    setState((s) => ({ ...s, avatar }));
  }, []);

  const setToken = useCallback((token: string) => {
    localStorage.setItem("codenames:token", token);
    setState((s) => ({ ...s, token }));
  }, []);

  const setIsHostDisplay = useCallback((isHostDisplay: boolean) => {
    setState((s) => ({ ...s, isHostDisplay }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem("codenames:displayName");
    localStorage.removeItem("codenames:roomCode");
    localStorage.removeItem("codenames:gameType");
    localStorage.removeItem("codenames:token");
    localStorage.removeItem("codenames:avatar");
    setState(defaultState);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        setDisplayName, setRoomCode, setTeamAndRole, setIsHost,
        setGameType, setAvatar, setToken, setIsHostDisplay, reset,
      }}
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
