import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { connectSocket, getSocket } from "../socket";
import { GameType, KalakLanguage, DEFAULT_KALAK_TIMERS } from "shared/types";
import type { KalakTimerConfig } from "shared/types";

export function HostSetupPage() {
  const player = usePlayer();
  const { dispatch } = useGame();
  const [gameType, setGameType] = useState<GameType>(GameType.KALAK);
  const [showSettings, setShowSettings] = useState(false);

  // Kalak settings
  const [language, setLanguage] = useState<KalakLanguage>(KalakLanguage.ENGLISH);
  const [totalRounds, setTotalRounds] = useState(10);
  const [freeMode, setFreeMode] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [timers, setTimers] = useState<KalakTimerConfig>({ ...DEFAULT_KALAK_TIMERS });

  const handleSelectGame = (type: GameType) => {
    setGameType(type);
    if (type === GameType.KALAK) {
      setShowSettings(true);
    } else {
      setShowSettings(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleCreateRoom = () => {
    player.setIsHostDisplay(true);
    player.setGameType(gameType);
    dispatch({ type: "SET_GAME_TYPE", payload: gameType });
    connectSocket("__HOST_DISPLAY__");
    const socket = getSocket();
    socket.emit("client:create-room", { gameType });

    // Pre-send settings once room is created
    if (gameType === GameType.KALAK) {
      socket.once("server:kalak-lobby-state", () => {
        socket.emit("client:kalak-update-settings", {
          language,
          categories,
          totalRounds,
          freeMode,
          timers,
        });
      });
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-2xl">
        {/* Title */}
        <h1 className="font-display text-6xl sm:text-7xl font-bold text-center mb-2 text-white tracking-tight">
          GAME NIGHT
        </h1>
        <p className="text-center text-gray-400 mb-10 text-lg">
          Select a game to host on this display
        </p>

        {/* Game Selection Cards */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
          <button
            onClick={() => handleSelectGame(GameType.CODENAMES)}
            className={`p-6 sm:p-8 rounded-2xl border-2 text-center transition-all active:scale-95
              ${gameType === GameType.CODENAMES
                ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
                : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
          >
            <div className="text-4xl sm:text-5xl mb-3">🕵️</div>
            <div className="font-bold text-xl sm:text-2xl text-white">Codenames</div>
            <div className="text-sm text-gray-400 mt-1">Team word game</div>
          </button>
          <button
            onClick={() => handleSelectGame(GameType.KALAK)}
            className={`p-6 sm:p-8 rounded-2xl border-2 text-center transition-all active:scale-95
              ${gameType === GameType.KALAK
                ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
          >
            <div className="text-4xl sm:text-5xl mb-3">🎭</div>
            <div className="font-bold text-xl sm:text-2xl text-white">Kalak</div>
            <div className="text-sm text-gray-400 mt-1">Trivia bluff game</div>
          </button>
        </div>

        {/* Kalak Settings Panel */}
        {showSettings && gameType === GameType.KALAK && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-8 mb-8 space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Kalak Settings
            </h2>

            {/* Language */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Language</label>
              <div className="grid grid-cols-2 gap-3">
                {([KalakLanguage.ENGLISH, KalakLanguage.ARABIC] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all active:scale-95
                      ${language === lang
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                  >
                    {lang === KalakLanguage.ENGLISH ? "English" : "العربية"}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Rounds</label>
              <div className="flex gap-3">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95
                      ${totalRounds === n
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
                onClick={() => setFreeMode(!freeMode)}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95
                  ${freeMode
                    ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs
                  ${freeMode ? "border-white bg-white/20" : "border-gray-500"}`}>
                  {freeMode && "✓"}
                </span>
                Free Mode (cached questions only, no AI)
              </button>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                Categories (optional)
              </label>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/50 text-purple-300 rounded-full text-sm font-semibold"
                    >
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-purple-500 hover:text-purple-200 font-bold text-xs leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add a category..."
                  maxLength={40}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-600
                             text-white placeholder-gray-500
                             focus:border-purple-500 focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold
                             hover:bg-purple-700 active:scale-95 transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Timer Config */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-3 uppercase">
                Timer Settings (seconds)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "answering" as const, label: "Answering Time", min: 15, max: 120 },
                  { key: "voting" as const, label: "Voting Time", min: 10, max: 60 },
                  { key: "reveal" as const, label: "Reveal Duration", min: 4, max: 20 },
                  { key: "leaderboard" as const, label: "Leaderboard Duration", min: 5, max: 20 },
                ]).map(({ key, label, min, max }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-mono text-purple-400">{timers[key]}s</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={timers[key]}
                      onChange={(e) =>
                        setTimers((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                                 accent-purple-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          className={`w-full py-5 text-white rounded-2xl font-bold text-xl sm:text-2xl
                     shadow-lg active:scale-95 transition-all
                     ${gameType === GameType.KALAK
                       ? "bg-purple-600 shadow-purple-600/30 hover:bg-purple-700"
                       : "bg-red-600 shadow-red-600/30 hover:bg-red-700"
                     }`}
        >
          Create Room
        </button>
      </div>
    </div>
  );
}
