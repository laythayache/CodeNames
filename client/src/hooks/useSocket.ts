import { useEffect } from "react";
import { getSocket } from "../socket";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import type {
  GameStatePayload, LobbyStatePayload, GameOverPayload,
  VotesUpdatedPayload, KalakGameStatePayload, KalakLobbyStatePayload,
  KalakGameOverPayload, KalakRoundResult, Player, GameType,
} from "shared/types";

export function useSocketEvents(): void {
  const { dispatch } = useGame();
  const player = usePlayer();

  useEffect(() => {
    const socket = getSocket();

    // ── Shared events ──

    const onRoomCreated = (data: { roomCode: string; gameType?: GameType }) => {
      player.setRoomCode(data.roomCode);
      if (data.gameType) {
        player.setGameType(data.gameType);
        dispatch({ type: "SET_GAME_TYPE", payload: data.gameType });
      }
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

    // ── Codenames events ──

    const onLobbyState = (data: LobbyStatePayload) => {
      dispatch({ type: "SET_LOBBY_STATE", payload: data });
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

    // ── Kalak events ──

    const onKalakLobbyState = (data: KalakLobbyStatePayload) => {
      dispatch({ type: "SET_KALAK_LOBBY_STATE", payload: data });
      const me = data.players.find((p: Player) => p.displayName === player.displayName);
      if (me) {
        player.setIsHost(me.isHost);
      }
    };

    const onKalakGameState = (data: KalakGameStatePayload) => {
      dispatch({ type: "SET_KALAK_GAME_STATE", payload: data });
      const me = data.players.find((p: Player) => p.displayName === player.displayName);
      if (me) {
        player.setIsHost(me.isHost);
      }
    };

    const onKalakGameOver = (data: KalakGameOverPayload) => {
      dispatch({ type: "SET_KALAK_GAME_OVER", payload: data });
    };

    const onKalakRoundResult = (data: KalakRoundResult) => {
      dispatch({ type: "SET_KALAK_ROUND_RESULT", payload: data });
    };

    // ── Register ──

    socket.on("server:room-created", onRoomCreated);
    socket.on("server:lobby-state", onLobbyState);
    socket.on("server:game-state", onGameState);
    socket.on("server:game-over", onGameOver);
    socket.on("server:votes-updated", onVotesUpdated);
    socket.on("server:timer-tick", onTimerTick);
    socket.on("server:timer-expired", onTimerExpired);
    socket.on("server:player-kicked", onKicked);
    socket.on("server:join-error", onError);
    socket.on("server:error", onError);
    socket.on("server:kalak-lobby-state", onKalakLobbyState);
    socket.on("server:kalak-game-state", onKalakGameState);
    socket.on("server:kalak-game-over", onKalakGameOver);
    socket.on("server:kalak-round-result", onKalakRoundResult);

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
      socket.off("server:error", onError);
      socket.off("server:kalak-lobby-state", onKalakLobbyState);
      socket.off("server:kalak-game-state", onKalakGameState);
      socket.off("server:kalak-game-over", onKalakGameOver);
      socket.off("server:kalak-round-result", onKalakRoundResult);
    };
  }, [dispatch, player]);
}
