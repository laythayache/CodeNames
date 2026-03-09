import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { KalakLanguage } from "shared/types";
import { AvatarDisplay } from "../components/Avatar";

export function KalakLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.kalakLobbyState;
  const [newCategory, setNewCategory] = useState("");

  if (!lobby) return null;

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    getSocket().emit("client:kalak-add-category", { category: trimmed });
    setNewCategory("");
  };

  const connectedCount = lobby.players.filter((p) => p.isConnected).length;

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-parchment mb-1">
            KALAK
          </h1>
          <p className="text-parchment-dark text-xs sm:text-sm mb-3">Trivia Bluff Game</p>
          <div className="bg-parchment inline-block px-6 py-2 rounded-xl shadow-lg">
            <span className="text-[10px] font-bold text-gray-400 block mb-0.5">ROOM CODE</span>
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.3em] text-wood-dark select-all">
              {player.roomCode}
            </span>
          </div>
        </div>

        {/* Players */}
        <div className="bg-parchment rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-500 mb-3">
            PLAYERS ({connectedCount})
          </h2>
          <div className="space-y-2">
            {lobby.players.map((p) => (
              <div
                key={p.displayName}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg
                  ${p.isConnected ? "bg-purple-50" : "bg-gray-50 opacity-50"}`}
              >
                {/* Avatar */}
                <div className="shrink-0">
                  {p.avatar ? (
                    <AvatarDisplay avatar={p.avatar} size={36} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">
                        {p.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className={`font-semibold text-sm flex-1 truncate
                  ${p.isConnected ? "text-purple-800" : "text-gray-400"}`}
                >
                  {p.displayName}
                  {p.displayName === player.displayName && (
                    <span className="text-purple-400 ml-1">(you)</span>
                  )}
                </span>

                {/* Status badges */}
                {p.isHost && (
                  <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                    Host
                  </span>
                )}
                {!p.isConnected && (
                  <span className="text-xs text-gray-400 italic">offline</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game Settings — read-only for players */}
        <div className="bg-parchment rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-500 mb-3">GAME SETTINGS</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5">LANGUAGE</p>
              <p className="text-sm font-semibold text-wood-dark">
                {lobby.language === KalakLanguage.ENGLISH ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5">ROUNDS</p>
              <p className="text-sm font-semibold text-wood-dark">{lobby.totalRounds}</p>
            </div>
            {lobby.freeMode && (
              <div className="bg-green-50 rounded-lg p-3 text-center col-span-2">
                <p className="text-[10px] font-bold text-green-600 mb-0.5">MODE</p>
                <p className="text-sm font-semibold text-green-700">Free (cached questions only)</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-parchment rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-500 mb-3">CATEGORIES</h2>

          {/* Category chips */}
          {lobby.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {lobby.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold"
                >
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-3 italic">No categories added yet</p>
          )}

          {/* Add category input — any player can add */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Suggest a category..."
              maxLength={40}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-parchment-dark bg-white
                         focus:border-purple-500 focus:outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategory.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold
                         hover:bg-purple-700 active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Waiting for host message */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-6 h-6 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
          <p className="text-purple-700 text-sm font-semibold">
            Waiting for host to start the game...
          </p>
          <p className="text-purple-400 text-xs mt-1">
            {connectedCount < 3
              ? `Need at least 3 players (${connectedCount} connected)`
              : `${connectedCount} players ready`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
