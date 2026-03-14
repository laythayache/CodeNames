import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { GwdwLanguage } from "shared/types";
import { AvatarDisplay } from "../components/Avatar";

export function GwdwLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.gwdwLobbyState;
  const [newCategory, setNewCategory] = useState("");

  if (!lobby) return null;

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    getSocket().emit("client:gwdw-add-category", { category: trimmed });
    setNewCategory("");
  };

  const connectedCount = lobby.players.filter((p) => p.isConnected).length;

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-parchment mb-1">
            GUESS WHO
          </h1>
          <p className="text-parchment-dark text-xs sm:text-sm mb-3">Guess Who Did What</p>
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
                  ${p.isConnected ? "bg-teal-50" : "bg-gray-50 opacity-50"}`}
              >
                <div className="shrink-0">
                  {p.avatar ? (
                    <AvatarDisplay avatar={p.avatar} size={36} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-teal-200 flex items-center justify-center">
                      <span className="text-teal-600 font-bold text-sm">
                        {p.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className={`font-semibold text-sm flex-1 truncate
                  ${p.isConnected ? "text-teal-800" : "text-gray-400"}`}
                >
                  {p.displayName}
                  {p.displayName === player.displayName && (
                    <span className="text-teal-400 ml-1">(you)</span>
                  )}
                </span>
                {p.isHost && (
                  <span className="text-xs bg-teal-200 text-teal-700 px-2 py-0.5 rounded-full font-bold">
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

        {/* Game Settings */}
        <div className="bg-parchment rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-500 mb-3">GAME SETTINGS</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5">LANGUAGE</p>
              <p className="text-sm font-semibold text-wood-dark">
                {lobby.language === GwdwLanguage.ENGLISH ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold text-gray-400 mb-0.5">ROUNDS</p>
              <p className="text-sm font-semibold text-wood-dark">{lobby.totalRounds}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-parchment rounded-xl p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-500 mb-3">CATEGORIES</h2>
          {lobby.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {lobby.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold"
                >
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-3 italic">No categories added yet</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Suggest a category..."
              maxLength={40}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-parchment-dark bg-white
                         focus:border-teal-500 focus:outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategory.trim()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold
                         hover:bg-teal-700 active:scale-95 transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Waiting for host */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-6 h-6 border-3 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
          </div>
          <p className="text-teal-700 text-sm font-semibold">
            Waiting for host to start the game...
          </p>
          <p className="text-teal-400 text-xs mt-1">
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
