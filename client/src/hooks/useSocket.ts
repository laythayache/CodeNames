import { useEffect } from "react";
import { getSocket } from "../socket";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import type {
  GameStatePayload, LobbyStatePayload, GameOverPayload,
  VotesUpdatedPayload, Player,
} from "shared/types";

export function useSocketEvents(): void {
  const { dispatch } = useGame();
  const player = usePlayer();

  useEffect(() => {
    const socket = getSocket();

    const onRoomCreated = (data: { roomCode: string }) => {
      player.setRoomCode(data.roomCode);
    };

    const onLobbyState = (data: LobbyStatePayload) => {
      dispatch({ type: "SET_LOBBY_STATE", payload: data });
      // Update local player info from server state
      const me = data.players.find((p: Player) => p.displayName === player.displayName);
      if (me) {
        player.setTeamAndRole(me.team, me.role);
        player.setIsHost(me.isHost);
      }
    };

    const onGameState = (data: GameStatePayload) => {
      dispatch({ type: "SET_GAME_STATE", payload: data });
      const me = data.players.find((p: Player) => p.displayName === player.displayName);
      if (me) {
        player.setTeamAndRole(me.team, me.role);
        player.setIsHost(me.isHost);
      }
    };

    const onGameOver = (data: GameOverPayload) => {
      dispatch({ type: "SET_GAME_OVER", payload: data });
    };

    const onVotesUpdated = (data: VotesUpdatedPayload) => {
      dispatch({ type: "SET_VOTES", payload: data });
    };

    const onTimerTick = (data: { secondsRemaining: number }) => {
      dispatch({ type: "SET_TIMER", payload: data.secondsRemaining });
    };

    const onTimerExpired = () => {
      dispatch({ type: "TIMER_EXPIRED" });
    };

    const onKicked = () => {
      dispatch({ type: "KICKED" });
    };

    const onError = (data: { message: string }) => {
      console.error("Server error:", data.message);
      alert(data.message);
    };

    socket.on("server:room-created", onRoomCreated);
    socket.on("server:lobby-state", onLobbyState);
    socket.on("server:game-state", onGameState);
    socket.on("server:game-over", onGameOver);
    socket.on("server:votes-updated", onVotesUpdated);
    socket.on("server:timer-tick", onTimerTick);
    socket.on("server:timer-expired", onTimerExpired);
    socket.on("server:player-kicked", onKicked);
    socket.on("server:join-error", onError);

    return () => {
      socket.off("server:room-created", onRoomCreated);
      socket.off("server:lobby-state", onLobbyState);
      socket.off("server:game-state", onGameState);
      socket.off("server:game-over", onGameOver);
      socket.off("server:votes-updated", onVotesUpdated);
      socket.off("server:timer-tick", onTimerTick);
      socket.off("server:timer-expired", onTimerExpired);
      socket.off("server:player-kicked", onKicked);
      socket.off("server:join-error", onError);
    };
  }, [dispatch, player]);
}
