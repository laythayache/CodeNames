import { useEffect } from "react";
import { useSocketEvents } from "./hooks/useSocket";
import { useGame } from "./context/GameContext";
import { usePlayer } from "./context/PlayerContext";
import { GamePhase, GameType } from "shared/types";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { GamePage } from "./pages/GamePage";
import { GameOverPage } from "./pages/GameOverPage";
import { KalakLobbyPage } from "./pages/KalakLobbyPage";
import { KalakGamePage } from "./pages/KalakGamePage";
import { KalakGameOverPage } from "./pages/KalakGameOverPage";
import { KalakHostLobbyPage } from "./pages/KalakHostLobbyPage";
import { KalakHostGamePage } from "./pages/KalakHostGamePage";
import { KalakHostGameOverPage } from "./pages/KalakHostGameOverPage";
import { CodenamesHostLobbyPage } from "./pages/CodenamesHostLobbyPage";
import { CodenamesHostGamePage } from "./pages/CodenamesHostGamePage";
import { CodenamesHostGameOverPage } from "./pages/CodenamesHostGameOverPage";
import { JoinPage } from "./pages/JoinPage";
import { disconnectSocket, getSocket } from "./socket";

function KickedPage() {
  const player = usePlayer();
  const { dispatch } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-team-red mb-4">You've been removed</h1>
        <p className="text-gray-600 mb-6">The host has removed you from the game.</p>
        <button
          onClick={() => {
            disconnectSocket();
            player.reset();
            dispatch({ type: "RESET" });
            window.history.replaceState({}, "", window.location.pathname);
          }}
          className="px-6 py-3 bg-wood text-white rounded-lg font-semibold hover:bg-wood-dark"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  useSocketEvents();

  const { state } = useGame();
  const player = usePlayer();

  // Listen for server:room-created to set isHostDisplay when applicable
  useEffect(() => {
    const socket = getSocket();

    const onRoomCreated = (data: { roomCode: string; isHostDisplay?: boolean }) => {
      if (data.isHostDisplay) {
        player.setIsHostDisplay(true);
      }
    };

    socket.on("server:room-created", onRoomCreated);
    return () => {
      socket.off("server:room-created", onRoomCreated);
    };
  }, [player]);

  // ── Check if URL has ?room=XXX → JoinPage (player scanning QR) ──
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");

  if (roomParam && (!player.roomCode || player.roomCode !== roomParam.toUpperCase())) {
    return <JoinPage />;
  }

  // ── Kicked state ──
  if (state.kicked) {
    return <KickedPage />;
  }

  // ── Host display routing (laptop/TV screen) ──
  if (player.isHostDisplay) {
    const gameType = state.gameType ?? player.gameType;

    if (gameType === GameType.KALAK) {
      // Kalak host display
      if (state.kalakGameOver) return <KalakHostGameOverPage />;
      if (state.kalakHostDisplay) return <KalakHostGamePage />;
      if (state.kalakLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-felt">
          <div className="bg-parchment rounded-2xl p-12 text-center shadow-xl">
            <div className="animate-spin w-12 h-12 border-4 border-wood border-t-transparent rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-wood-dark">Preparing questions...</h2>
          </div>
        </div>
      );
      if (state.kalakLobbyState) return <KalakHostLobbyPage />;
    } else {
      // Codenames host display
      if (state.gameOver) return <CodenamesHostGameOverPage />;
      if (state.codenamesHostDisplay) return <CodenamesHostGamePage />;
      if (state.lobbyState) return <CodenamesHostLobbyPage />;
    }

    // Host display waiting for room creation to complete
    return <HomePage />;
  }

  // ── Kalak player routing ──
  if (state.gameType === GameType.KALAK || player.gameType === GameType.KALAK) {
    const kalakPhase = state.kalakState?.phase;

    if (kalakPhase === GamePhase.GAME_OVER || state.kalakGameOver) {
      return <KalakGameOverPage />;
    }
    if (kalakPhase === GamePhase.PLAYING) {
      return <KalakGamePage />;
    }
    if (state.kalakLobbyState && player.roomCode) {
      return <KalakLobbyPage />;
    }
  }

  // ── Codenames player routing ──
  const phase = state.gameState?.phase;

  if (phase === GamePhase.GAME_OVER || state.gameOver) {
    return <GameOverPage />;
  }

  if (phase === GamePhase.PLAYING || phase === GamePhase.PAUSED) {
    return <GamePage />;
  }

  if (state.lobbyState && player.roomCode) {
    return <LobbyPage />;
  }

  // ── Default → HomePage ──
  return <HomePage />;
}

export default function App() {
  return <AppContent />;
}
