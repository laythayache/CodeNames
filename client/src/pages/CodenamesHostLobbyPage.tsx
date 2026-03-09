import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { QRCodeSVG } from "qrcode.react";
import { AvatarDisplay } from "../components/Avatar";
import { useLanJoinUrl } from "../hooks/useLanUrl";
import { Team, Role, type Player } from "shared/types";

export function CodenamesHostLobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.lobbyState;

  if (!lobby) return null;

  const roomCode = lobby.roomCode || player.roomCode;
  const joinUrl = useLanJoinUrl(roomCode);

  const redPlayers = lobby.players.filter((p) => p.team === Team.RED);
  const bluePlayers = lobby.players.filter((p) => p.team === Team.BLUE);
  const unassigned = lobby.players.filter((p) => p.team === null);

  const canStart = redPlayers.length > 0 && bluePlayers.length > 0
    && redPlayers.some((p) => p.role === Role.SPYMASTER)
    && bluePlayers.some((p) => p.role === Role.SPYMASTER);

  const handleStart = () => {
    getSocket().emit("client:start-game");
  };

  const handleUpdateSettings = (timerEnabled: boolean, timerDuration: number) => {
    getSocket().emit("client:update-settings", { timerEnabled, timerDuration });
  };

  const handleKick = (displayName: string) => {
    getSocket().emit("client:admin-kick", { displayName });
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-red-950/20 via-gray-950 to-blue-950/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 py-8 min-h-dvh">
        {/* Header */}
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
          CODENAMES
        </h1>
        <p className="text-gray-400 text-sm mb-6">Waiting for players to join...</p>

        {/* QR + Room Code */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <QRCodeSVG value={joinUrl} size={180} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Room Code</p>
            <p className="text-5xl font-mono font-bold text-white tracking-[0.3em]">
              {roomCode}
            </p>
            <p className="text-gray-500 text-xs mt-2 max-w-[200px] break-all">{joinUrl}</p>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-3xl mb-6">
          <HostTeamPanel
            team={Team.RED}
            players={redPlayers}
            onKick={handleKick}
          />
          <HostTeamPanel
            team={Team.BLUE}
            players={bluePlayers}
            onKick={handleKick}
          />
        </div>

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 w-full max-w-3xl mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Unassigned ({unassigned.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {unassigned.map((p) => (
                <div key={p.displayName} className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
                  {p.avatar && <AvatarDisplay avatar={p.avatar} size={28} />}
                  <span className="text-sm font-semibold">{p.displayName}</span>
                  {!p.isConnected && <span className="text-red-400 text-xs">(offline)</span>}
                  <button
                    onClick={() => handleKick(p.displayName)}
                    className="text-red-400 hover:text-red-300 text-xs ml-1"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 w-full max-w-3xl mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Settings</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lobby.timerEnabled}
                onChange={(e) => handleUpdateSettings(e.target.checked, lobby.timerDuration)}
                className="w-5 h-5 accent-purple-500"
              />
              <span className="text-sm font-medium text-gray-300">Turn Timer</span>
            </label>
            {lobby.timerEnabled && (
              <select
                value={lobby.timerDuration}
                onChange={(e) => handleUpdateSettings(true, Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white"
              >
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
                <option value={180}>180s</option>
              </select>
            )}
          </div>
        </div>

        {/* Player count + Start */}
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            <span className="text-white font-bold">{lobby.players.length}</span> player{lobby.players.length !== 1 ? "s" : ""} connected
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`px-12 py-5 rounded-2xl font-bold text-xl transition-all
            ${canStart
              ? "bg-green-600 text-white shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-95"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
        >
          {canStart ? "START GAME" : "Each team needs a spymaster"}
        </button>
      </div>
    </div>
  );
}

function HostTeamPanel({ team, players, onKick }: {
  team: Team;
  players: Player[];
  onKick: (name: string) => void;
}) {
  const isRed = team === Team.RED;
  const borderColor = isRed ? "border-red-700/50" : "border-blue-700/50";
  const headerColor = isRed ? "text-red-400" : "text-blue-400";
  const bgGlow = isRed ? "from-red-950/30" : "from-blue-950/30";

  const spymaster = players.find((p) => p.role === Role.SPYMASTER);
  const operatives = players.filter((p) => p.role === Role.OPERATIVE);

  return (
    <div className={`bg-linear-to-b ${bgGlow} to-gray-900/80 border ${borderColor} rounded-xl p-5`}>
      <h2 className={`${headerColor} font-bold text-lg mb-4`}>
        {isRed ? "RED TEAM" : "BLUE TEAM"}
      </h2>

      {/* Spymaster */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 font-bold mb-1">SPYMASTER</p>
        {spymaster ? (
          <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-lg">
            {spymaster.avatar && <AvatarDisplay avatar={spymaster.avatar} size={28} />}
            <span className="text-sm font-semibold flex-1">{spymaster.displayName}</span>
            {!spymaster.isConnected && <span className="text-red-400 text-xs">(offline)</span>}
            <button onClick={() => onKick(spymaster.displayName)} className="text-red-400 hover:text-red-300 text-xs">x</button>
          </div>
        ) : (
          <div className="text-gray-600 text-sm italic">Waiting...</div>
        )}
      </div>

      {/* Operatives */}
      <div>
        <p className="text-xs text-gray-500 font-bold mb-1">OPERATIVES</p>
        <div className="space-y-1.5">
          {operatives.length === 0 && (
            <div className="text-gray-600 text-sm italic">None yet</div>
          )}
          {operatives.map((p) => (
            <div key={p.displayName} className="flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-lg">
              {p.avatar && <AvatarDisplay avatar={p.avatar} size={28} />}
              <span className="text-sm font-semibold flex-1">{p.displayName}</span>
              {!p.isConnected && <span className="text-red-400 text-xs">(offline)</span>}
              <button onClick={() => onKick(p.displayName)} className="text-red-400 hover:text-red-300 text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
