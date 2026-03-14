import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useGame } from "../context/GameContext";
import { connectSocket, getSocket } from "../socket";
import { GameType } from "shared/types";

export function HomePage() {
  const player = usePlayer();
  const { dispatch } = useGame();
  const [gameType, setGameType] = useState<GameType>(GameType.CODENAMES);

  const handleCreate = () => {
    // Both games: laptop is host display, no name needed
    player.setGameType(gameType);
    player.setIsHostDisplay(true);
    dispatch({ type: "SET_GAME_TYPE", payload: gameType });
    connectSocket();
    getSocket().emit("client:create-room", { gameType });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-center mb-2 text-wood-dark">
          GAME NIGHT
        </h1>
        <p className="text-center text-wood mb-6 text-sm">Pick a game and play with friends</p>

        <div className="space-y-4">
          {/* Game Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">CHOOSE GAME</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setGameType(GameType.CODENAMES)}
                className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95
                  ${gameType === GameType.CODENAMES
                    ? "border-team-red bg-team-red/10 shadow-md"
                    : "border-parchment-dark bg-white hover:border-gray-400"
                  }`}
              >
                <div className="text-2xl mb-1">&#x1F575;&#xFE0F;</div>
                <div className="font-bold text-sm text-wood-dark">Codenames</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Team word game</div>
              </button>
              <button
                onClick={() => setGameType(GameType.KALAK)}
                className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95
                  ${gameType === GameType.KALAK
                    ? "border-purple-500 bg-purple-500/10 shadow-md"
                    : "border-parchment-dark bg-white hover:border-gray-400"
                  }`}
              >
                <div className="text-2xl mb-1">&#x1F3AD;</div>
                <div className="font-bold text-sm text-wood-dark">Kalak</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Trivia bluff game</div>
              </button>
              <button
                onClick={() => setGameType(GameType.GWDW)}
                className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95
                  ${gameType === GameType.GWDW
                    ? "border-teal-500 bg-teal-500/10 shadow-md"
                    : "border-parchment-dark bg-white hover:border-gray-400"
                  }`}
              >
                <div className="text-2xl mb-1">&#x1F50D;</div>
                <div className="font-bold text-sm text-wood-dark">Guess Who</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Who wrote what?</div>
              </button>
            </div>
          </div>

          {/* Info note */}
          <div className={`border rounded-xl p-3 text-center
            ${gameType === GameType.KALAK
              ? "bg-purple-50 border-purple-200"
              : gameType === GameType.GWDW
                ? "bg-teal-50 border-teal-200"
                : "bg-red-50 border-red-200"
            }`}>
            <p className={`text-xs font-semibold
              ${gameType === GameType.KALAK ? "text-purple-700"
                : gameType === GameType.GWDW ? "text-teal-700"
                : "text-red-700"}`}>
              This screen becomes the host display. Players join via QR code on their phones.
            </p>
          </div>

          <button
            onClick={handleCreate}
            className={`w-full py-4 text-white rounded-xl font-bold text-lg
                       shadow-lg active:scale-95 transition-all
                       ${gameType === GameType.KALAK
                         ? "bg-purple-600 shadow-purple-600/30 hover:bg-purple-700"
                         : gameType === GameType.GWDW
                           ? "bg-teal-600 shadow-teal-600/30 hover:bg-teal-700"
                           : "bg-team-red shadow-team-red/30 hover:bg-team-red-dark"
                       }`}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}
