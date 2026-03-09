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
    <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-center mb-2 text-wood-dark">
          CODENAMES
        </h1>
        <p className="text-center text-wood mb-8 text-sm">Top Secret Word Game</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your agent name..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                       focus:border-wood focus:outline-none text-lg"
          />
        </div>

        {mode === "menu" ? (
          <div className="space-y-4">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full py-4 bg-team-red text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-team-red/30
                         active:scale-95 hover:bg-team-red-dark transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
