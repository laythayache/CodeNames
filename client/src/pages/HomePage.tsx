import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { connectSocket, getSocket } from "../socket";

export function HomePage() {
  const player = usePlayer();
  const [name, setName] = useState(player.displayName);
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "join">("menu");

  const handleCreate = () => {
    if (!name.trim()) return;
    player.setDisplayName(name.trim());
    connectSocket(name.trim());
    getSocket().emit("client:create-room", { displayName: name.trim() });
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
    <div className="min-h-screen flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-center mb-2 text-wood-dark">
          CODENAMES
        </h1>
        <p className="text-center text-wood mb-8 text-sm">Top Secret Word Game</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your agent name..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg border-2 border-parchment-dark bg-white
                       focus:border-wood focus:outline-none text-lg"
          />
        </div>

        {mode === "menu" ? (
          <div className="space-y-3">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full py-3 bg-team-red text-white rounded-lg font-semibold text-lg
                         hover:bg-team-red-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode("join")}
              disabled={!name.trim()}
              className="w-full py-3 bg-team-blue text-white rounded-lg font-semibold text-lg
                         hover:bg-team-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Game
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-letter code..."
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg border-2 border-parchment-dark bg-white
                         focus:border-wood focus:outline-none text-lg text-center tracking-widest
                         uppercase font-mono"
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || roomCode.length < 6}
              className="w-full py-3 bg-team-blue text-white rounded-lg font-semibold text-lg
                         hover:bg-team-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
            <button
              onClick={() => setMode("menu")}
              className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
