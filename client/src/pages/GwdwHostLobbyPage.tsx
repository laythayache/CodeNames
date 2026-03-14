import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { QRCodeSVG } from "qrcode.react";
import { AvatarDisplay } from "../components/Avatar";
import { useLanJoinUrl } from "../hooks/useLanUrl";
import { GwdwLanguage, DEFAULT_GWDW_TIMERS } from "shared/types";
import type { GwdwTimerConfig } from "shared/types";

export function GwdwHostLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.gwdwLobbyState;

  const [newCategory, setNewCategory] = useState("");
  const [timers, setTimers] = useState<GwdwTimerConfig>(
    lobby?.timers ?? { ...DEFAULT_GWDW_TIMERS }
  );

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
    language: GwdwLanguage;
    categories: string[];
    totalRounds: number;
    timers: GwdwTimerConfig;
  }> = {}) => {
    getSocket().emit("client:gwdw-update-settings", {
      language: overrides.language ?? lobby.language,
      categories: overrides.categories ?? lobby.categories,
      totalRounds: overrides.totalRounds ?? lobby.totalRounds,
      timers: overrides.timers ?? timers,
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    getSocket().emit("client:gwdw-add-category", { category: trimmed });
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    getSocket().emit("client:gwdw-remove-category", { category: cat });
  };

  const handleTimerChange = (key: keyof GwdwTimerConfig, value: number) => {
    const updated = { ...timers, [key]: value };
    setTimers(updated);
    emitSettings({ timers: updated });
  };

  const handleStart = () => {
    getSocket().emit("client:gwdw-start-game");
  };

  return (
    <div className="min-h-dvh bg-gray-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            GUESS WHO
          </h1>
          <div className="text-sm text-gray-500 font-mono">
            HOST DISPLAY
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: QR + Room Code */}
          <div className="lg:col-span-1 flex flex-col items-center">
            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-teal-500/10 mb-4">
              <QRCodeSVG
                value={joinUrl}
                size={220}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-1 uppercase tracking-wider font-bold">
                Room Code
              </p>
              <div className="font-mono text-6xl sm:text-7xl font-bold tracking-[0.2em] text-teal-400 select-all">
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

            {/* Settings */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Settings
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {/* Language Toggle */}
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1 uppercase">Language</label>
                  <div className="flex gap-1">
                    {([GwdwLanguage.ENGLISH, GwdwLanguage.ARABIC] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => emitSettings({ language: lang })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95
                          ${lobby.language === lang
                            ? "bg-teal-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                          }`}
                      >
                        {lang === GwdwLanguage.ENGLISH ? "EN" : "AR"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rounds */}
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[10px] text-gray-600 mb-1 uppercase">Rounds</label>
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => emitSettings({ totalRounds: n })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95
                          ${lobby.totalRounds === n
                            ? "bg-teal-600 text-white"
                            : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="mb-5">
                <label className="block text-[10px] text-gray-600 mb-2 uppercase">Categories</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {lobby.categories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-900/50 text-teal-300 rounded-full text-xs font-semibold"
                    >
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-teal-500 hover:text-teal-200 font-bold text-[10px] leading-none"
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
                               focus:border-teal-500 focus:outline-none"
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

              {/* Timer Sliders */}
              <div>
                <label className="block text-[10px] text-gray-600 mb-3 uppercase">
                  Timer Config
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: "writing" as const, label: "Writing", min: 15, max: 90 },
                    { key: "votingPerAnswer" as const, label: "Voting (per answer)", min: 5, max: 30 },
                    { key: "revealResult" as const, label: "Author Reveal", min: 3, max: 15 },
                    { key: "roundScores" as const, label: "Round Scores", min: 5, max: 20 },
                  ]).map(({ key, label, min, max }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-xs font-mono text-teal-400">{timers[key]}s</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={timers[key]}
                        onChange={(e) => handleTimerChange(key, Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer
                                   accent-teal-600"
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
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700"
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
