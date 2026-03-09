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
import { disconnectSocket } from "./socket";

function AppContent() {
  useSocketEvents();

  const { state, dispatch } = useGame();
  const player = usePlayer();

  // Kicked state
  if (state.kicked) {
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
            }}
            className="px-6 py-3 bg-wood text-white rounded-lg font-semibold hover:bg-wood-dark"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Kalak routing ──
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

  // ── Codenames routing ──
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

  return <HomePage />;
}

export default function App() {
  return <AppContent />;
}
