import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { QRCodeSVG } from "qrcode.react";
import { AvatarDisplay } from "../components/Avatar";
import { useLanJoinUrl } from "../hooks/useLanUrl";
import { KalakLanguage, DEFAULT_KALAK_TIMERS } from "shared/types";
import type { KalakTimerConfig } from "shared/types";

export function KalakHostLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.kalakLobbyState;

  const [newCategory, setNewCategory] = useState("");
  const [timers, setTimers] = useState<KalakTimerConfig>(
    lobby?.timers ?? { ...DEFAULT_KALAK_TIMERS }
  );

  // Sync timers from server state
  useEffect(() => {
    if (lobby?.timers) {
      setTimers(lobby.timers);
    }
  }, [lobby?.timers]);

  if (!lobby) return null;

  const roomCode = lobby.roomCode || player.roomCode;
  const connectedPlayers = lobby.players.filter((p) => p.isConnected);
  const canStart = connectedPlayers.length >= 3;
  const joinUrl = useLanJoinUrl(roomCode);

  const emitSettings = (overrides: Partial<{
    language: KalakLanguage;
    categories: string[];
    totalRounds: number;
    freeMode: boolean;
    timers: KalakTimerConfig;
  }> = {}) => {
    getSocket().emit("client:kalak-update-settings", {
      language: overrides.language ?? lobby.language,
      categories: overrides.categories ?? lobby.categories,
      totalRounds: overrides.totalRounds ?? lobby.totalRounds,
      freeMode: overrides.freeMode ?? lobby.freeMode,
      timers: overrides.timers ?? timers,
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

  const handleTimerChange = (key: keyof KalakTimerConfig, value: number) => {
    const updated = { ...timers, [key]: value };
    setTimers(updated);
    emitSettings({ timers: updated });
  };

  const handleStart = () => {
    getSocket().emit("client:kalak-start-game");
  };

  return (
    <div className="min-h-dvh bg-gray-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            KALAK
          </h1>
          <div className="text-sm text-gray-500 font-mono">
            HOST DISPLAY
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: QR + Room Code */}
          <div className="lg:col-span-1 flex flex-col items-center">
            {/* QR Code */}
            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-purple-500/10 mb-4">
              <QRCodeSVG
                value={joinUrl}
                size={220}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>

            {/* Room Code */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-1 uppercase tracking-wider font-bold">
                Room Code
              </p>
              <div className="font-mono text-6xl sm:text-7xl font-bold tracking-[0.2em] text-purple-400 select-all">
                {roomCode}
              </div>
            </div>

            <p className="text-gray-600 text-sm text-center">
              Scan or enter code to join
            </p>
          </div>

          {/* Right Column: Players + Settings */}
          <div className="lg:col-span-2 space-y-5">
            {/* Players */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Players
                </h2>
                <span className={`text-sm font-bold px-3 py-1 rounded-full
                  ${canStart ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                  {connectedPlayers.length} joined
                  {!canStart && ` (need ${3 - connectedPlayers.length} more)`}
                </span>
              </div>
              {connectedPlayers.length === 0 ? (
                <div className="text-gray-600 text-center py-8 text-lg">
                  Waiting for players to scan QR code...
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {connectedPlayers.map((p) => (
                    <div
                      key={p.displayName}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 rounded-xl"
                    >
                      {p.avatar && <AvatarDisplay avatar={p.avatar} size={36} />}
                      <span className="text-white font-semibold text-sm">
                        {p.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Settings
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {/* Language Toggle */}
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1 uppercase">Language</label>
                  <div className="flex gap-1">
                    {([KalakLanguage.ENGLISH, KalakLanguage.ARABIC] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => emitSettings({ language: lang })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95
                          ${lobby.language === lang
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                          }`}
                      >
                        {lang === KalakLanguage.ENGLISH ? "EN" : "AR"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rounds */}
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1 uppercase">Rounds</label>
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => emitSettings({ totalRounds: n })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95
                          ${lobby.totalRounds === n
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Mode */}
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[10px] text-gray-600 mb-1 uppercase">Mode</label>
                  <button
                    onClick={() => emitSettings({ freeMode: !lobby.freeMode })}
                    className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all active:scale-95
                      ${lobby.freeMode
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[8px]
                      ${lobby.freeMode ? "border-white bg-white/20" : "border-gray-600"}`}>
                      {lobby.freeMode && "✓"}
                    </span>
                    Free Mode (cached only)
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="mb-5">
                <label className="block text-[10px] text-gray-600 mb-2 uppercase">Categories</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {lobby.categories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/50 text-purple-300 rounded-full text-xs font-semibold"
                    >
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-purple-500 hover:text-purple-200 font-bold text-[10px] leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {lobby.categories.length === 0 && (
                    <span className="text-gray-600 text-xs">No categories (all topics)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add a category..."
                    maxLength={40}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700
                               text-white placeholder-gray-600 text-sm
                               focus:border-purple-500 focus:outline-none"
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

              {/* Timer Sliders */}
              <div>
                <label className="block text-[10px] text-gray-600 mb-3 uppercase">
                  Timer Config
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: "answering" as const, label: "Answering", min: 15, max: 120 },
                    { key: "voting" as const, label: "Voting", min: 10, max: 60 },
                    { key: "reveal" as const, label: "Reveal", min: 4, max: 20 },
                    { key: "leaderboard" as const, label: "Leaderboard", min: 5, max: 20 },
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
                        onChange={(e) => handleTimerChange(key, Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer
                                   accent-purple-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Game Button */}
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`w-full py-5 rounded-2xl font-bold text-xl sm:text-2xl transition-all active:scale-95
                ${canStart
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 hover:bg-purple-700"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
                }`}
            >
              {canStart ? "START GAME" : `Waiting for players (${connectedPlayers.length}/3 minimum)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
