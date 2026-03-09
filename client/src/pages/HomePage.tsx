import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useGame } from "../context/GameContext";
import { connectSocket, getSocket } from "../socket";
import { GameType } from "shared/types";

export function HomePage() {
  const player = usePlayer();
  const { dispatch } = useGame();
  const [name, setName] = useState(player.displayName);
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [gameType, setGameType] = useState<GameType>(GameType.CODENAMES);

  const handleCreate = () => {
    if (!name.trim()) return;
    player.setDisplayName(name.trim());
    player.setGameType(gameType);
    dispatch({ type: "SET_GAME_TYPE", payload: gameType });
    connectSocket(name.trim());
    getSocket().emit("client:create-room", { displayName: name.trim(), gameType });
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    player.setDisplayName(name.trim());
    connectSocket(name.trim(), roomCode.trim().toUpperCase());
    getSocket().emit("client:join-room", {
      roomCode: roomCode.trim().toUpperCase(),
      displayName: name.trim(),
    });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-center mb-2 text-wood-dark">
          GAME NIGHT
        </h1>
        <p className="text-center text-wood mb-6 text-sm">Pick a game and play with friends</p>

        {/* Name Input */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                       focus:border-wood focus:outline-none text-lg"
          />
        </div>

        {mode === "menu" ? (
          <div className="space-y-4">
            {/* Game Type Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">CHOOSE GAME</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameType(GameType.CODENAMES)}
                  className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95
                    ${gameType === GameType.CODENAMES
                      ? "border-team-red bg-team-red/10 shadow-md"
                      : "border-parchment-dark bg-white hover:border-gray-400"
                    }`}
                >
                  <div className="text-2xl mb-1">🕵️</div>
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
                  <div className="text-2xl mb-1">🎭</div>
                  <div className="font-bold text-sm text-wood-dark">Kalak</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Trivia bluff game</div>
                </button>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className={`w-full py-4 text-white rounded-xl font-bold text-lg
                         shadow-lg active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                         ${gameType === GameType.KALAK
                           ? "bg-purple-600 shadow-purple-600/30 hover:bg-purple-700"
                           : "bg-team-red shadow-team-red/30 hover:bg-team-red-dark"
                         }`}
            >
              Create Game
            </button>
            <button
              onClick={() => setMode("join")}
              disabled={!name.trim()}
              className="w-full py-4 bg-team-blue text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-team-blue/30
                         active:scale-95 hover:bg-team-blue-dark transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Join Game
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                           focus:border-wood focus:outline-none text-2xl text-center tracking-[0.3em]
                           uppercase font-mono font-bold"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!name.trim() || roomCode.length < 6}
              className="w-full py-4 bg-team-blue text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-team-blue/30
                         active:scale-95 hover:bg-team-blue-dark transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Join Room
            </button>
            <button
              onClick={() => setMode("menu")}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 active:scale-95 transition-all"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
