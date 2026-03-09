import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useGame } from "../context/GameContext";
import { connectSocket, getSocket } from "../socket";
import { AvatarBuilder } from "../components/AvatarBuilder";
import { AvatarDisplay } from "../components/Avatar";
import type { Avatar } from "shared/types";

function randomAvatar(): Avatar {
  return {
    eyes: Math.floor(Math.random() * 10),
    hair: Math.floor(Math.random() * 10),
    eyebrows: Math.floor(Math.random() * 10),
    mouth: Math.floor(Math.random() * 10),
    nose: Math.floor(Math.random() * 10),
    skinColor: Math.floor(Math.random() * 6),
    hairColor: Math.floor(Math.random() * 8),
  };
}

type Step = "name" | "avatar" | "ready";

export function JoinPage() {
  const player = usePlayer();

  // Parse room code from URL
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get("room") || "").toUpperCase();

  // Pre-fill from localStorage if returning player
  const [name, setName] = useState(player.displayName || "");
  const [avatar, setAvatar] = useState<Avatar>(
    player.avatar || randomAvatar()
  );
  const [step, setStep] = useState<Step>("name");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-reconnect: if we have a saved token and room code matches, try to rejoin
  useEffect(() => {
    const savedToken = localStorage.getItem("codenames:token");
    const savedRoom = localStorage.getItem("codenames:roomCode");
    const savedName = localStorage.getItem("codenames:displayName");

    if (savedToken && savedRoom && savedRoom === roomCode && savedName) {
      setJoining(true);
      setName(savedName);
      const savedAvatarStr = localStorage.getItem("codenames:avatar");
      const savedAvatar = savedAvatarStr ? JSON.parse(savedAvatarStr) : avatar;
      setAvatar(savedAvatar);

      connectSocket(savedName, roomCode);
      const socket = getSocket();
      socket.emit("client:join-room", {
        roomCode,
        displayName: savedName,
        avatar: savedAvatar,
      });

      // Listen for errors to fall back to manual join
      const onError = (data: { message: string }) => {
        setError(data.message);
        setJoining(false);
        socket.off("server:join-error", onError);
        socket.off("server:error", onError);
      };
      socket.on("server:join-error", onError);
      socket.on("server:error", onError);

      return () => {
        socket.off("server:join-error", onError);
        socket.off("server:error", onError);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitName = () => {
    if (!name.trim()) return;
    setStep("avatar");
  };

  const handleJoinGame = () => {
    if (!name.trim() || !roomCode) return;
    setJoining(true);
    setError(null);

    player.setDisplayName(name.trim());
    player.setAvatar(avatar);

    connectSocket(name.trim(), roomCode);
    const socket = getSocket();
    socket.emit("client:join-room", {
      roomCode,
      displayName: name.trim(),
      avatar,
    });

    // Listen for errors
    const onError = (data: { message: string }) => {
      setError(data.message);
      setJoining(false);
      socket.off("server:join-error", onError);
      socket.off("server:error", onError);
    };
    socket.on("server:join-error", onError);
    socket.on("server:error", onError);
  };

  // No room code in URL
  if (!roomCode) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
        <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center">
          <h1 className="font-display text-3xl font-bold text-wood-dark mb-4">
            No Room Code
          </h1>
          <p className="text-gray-600 mb-6">
            Scan a QR code or use a link with a room code to join a game.
          </p>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold
                       hover:bg-purple-700 active:scale-95 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Joining / auto-reconnect in progress
  if (joining && !error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
        <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center">
          <div className="mb-4">
            <AvatarDisplay avatar={avatar} size={80} />
          </div>
          <h2 className="font-display text-2xl font-bold text-wood-dark mb-2">
            Joining...
          </h2>
          <p className="text-gray-500 text-sm">
            Connecting to room <span className="font-mono font-bold tracking-wider">{roomCode}</span>
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-felt p-4">
      <div className="bg-parchment rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wood-dark mb-1">
            JOIN GAME
          </h1>
          <p className="text-gray-500 text-sm">
            Room: <span className="font-mono font-bold tracking-wider text-purple-700">{roomCode}</span>
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-700 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Step 1: Name */}
        {step === "name" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                           focus:border-purple-500 focus:outline-none text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitName()}
              />
            </div>
            <button
              onClick={handleSubmitName}
              disabled={!name.trim()}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-purple-600/30
                         active:scale-95 hover:bg-purple-700 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Avatar */}
        {step === "avatar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <AvatarBuilder value={avatar} onChange={setAvatar} />
            </div>
            <button
              onClick={() => setStep("ready")}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-purple-600/30
                         active:scale-95 hover:bg-purple-700 transition-all"
            >
              Looks Good!
            </button>
            <button
              onClick={() => setStep("name")}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700
                         active:scale-95 transition-all"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Ready / Confirm */}
        {step === "ready" && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-gray-100 rounded-2xl p-4 shadow-inner">
                <AvatarDisplay avatar={avatar} size={100} />
              </div>
              <p className="text-lg font-bold text-wood-dark">{name}</p>
            </div>
            <button
              onClick={handleJoinGame}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg
                         shadow-lg shadow-purple-600/30
                         active:scale-95 hover:bg-purple-700 transition-all"
            >
              Join Game
            </button>
            <button
              onClick={() => setStep("avatar")}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700
                         active:scale-95 transition-all"
            >
              Edit Avatar
            </button>
            <button
              onClick={() => setStep("name")}
              className="w-full py-2 text-gray-400 text-sm font-semibold hover:text-gray-600
                         active:scale-95 transition-all"
            >
              Change Name
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
