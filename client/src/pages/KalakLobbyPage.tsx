import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { KalakLanguage } from "shared/types";

export function KalakLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.kalakLobbyState;
  const [newCategory, setNewCategory] = useState("");

  if (!lobby) return null;

  const canStart = lobby.players.filter((p) => p.isConnected).length >= 3;

  const handleUpdateSettings = (
    language: KalakLanguage,
    totalRounds: number,
    freeMode: boolean
  ) => {
    getSocket().emit("client:kalak-update-settings", {
      language,
      categories: lobby.categories,
      totalRounds,
      freeMode,
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    getSocket().emit("client:kalak-add-category", { category: trimmed });
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    getSocket().emit("client:kalak-remove-category", { category: cat });
  };

  const handleStart = () => {
    getSocket().emit("client:kalak-start-game");
  };

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-parchment mb-1">
            KALAK
          </h1>
          <p className="text-parchment-dark text-xs sm:text-sm mb-3">Trivia Bluff Game</p>
          <div className="bg-parchment inline-block px-6 sm:px-8 py-3 rounded-xl shadow-lg">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.3em] text-wood-dark select-all">
              {player.roomCode}
            </span>
          </div>
        </div>

        {/* Players */}
        <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs font-bold text-gray-500 mb-3">
            PLAYERS ({lobby.players.filter((p) => p.isConnected).length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {lobby.players.map((p) => (
              <span
                key={p.displayName}
                className={`px-3 py-2 rounded-full text-sm font-semibold
                  ${p.isConnected ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-400"}`}
              >
                {p.displayName}
                {p.isHost && " 👑"}
                {!p.isConnected && " (offline)"}
              </span>
            ))}
          </div>
        </div>

        {/* Categories — any player can add */}
        <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs font-bold text-gray-500 mb-3">CATEGORIES</h2>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {lobby.categories.map((cat) => (
              <span
                key={cat}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold"
              >
                {cat}
                {player.isHost && (
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-purple-400 hover:text-purple-700 font-bold text-xs leading-none"
                  >
                    x
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Add category input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Add a category..."
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

        {/* Settings (host only) */}
        {player.isHost && (
          <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xs font-bold text-gray-500 mb-4">GAME SETTINGS</h2>

            {/* Language */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">LANGUAGE</label>
              <div className="grid grid-cols-2 gap-2">
                {([KalakLanguage.ENGLISH, KalakLanguage.ARABIC] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleUpdateSettings(lang, lobby.totalRounds, lobby.freeMode)}
                    className={`py-2.5 px-4 rounded-lg text-sm font-bold transition-all active:scale-95
                      ${lobby.language === lang
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {lang === KalakLanguage.ENGLISH ? "English" : "العربية"}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">ROUNDS</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleUpdateSettings(lobby.language, n, lobby.freeMode)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95
                      ${lobby.totalRounds === n
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Mode */}
            <div>
              <button
                onClick={() => handleUpdateSettings(lobby.language, lobby.totalRounds, !lobby.freeMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95
                  ${lobby.freeMode
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px]
                  ${lobby.freeMode ? "border-white bg-white/20" : "border-gray-400"}`}>
                  {lobby.freeMode && "✓"}
                </span>
                Free Mode (cached questions only, no AI)
              </button>
            </div>
          </div>
        )}

        {/* Non-host settings display */}
        {!player.isHost && (
          <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xs font-bold text-gray-500 mb-3">GAME SETTINGS</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-semibold">Language:</span> {lobby.language === KalakLanguage.ENGLISH ? "English" : "العربية"}</p>
              <p><span className="font-semibold">Rounds:</span> {lobby.totalRounds}</p>
              {lobby.freeMode && (
                <p><span className="font-semibold">Mode:</span> Free (cached questions only)</p>
              )}
            </div>
          </div>
        )}

        {/* Start Button */}
        {player.isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-bold text-lg sm:text-xl transition-all active:scale-95
              ${canStart
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 hover:bg-purple-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            {canStart ? "START GAME" : "Need at least 3 players"}
          </button>
        )}
      </div>
    </div>
  );
}
