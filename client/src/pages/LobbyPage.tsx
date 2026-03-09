import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { Team, Role, type Player } from "shared/types";

export function LobbyPage() {
  const { state } = useGame();
  const player = usePlayer();
  const lobby = state.lobbyState;

  if (!lobby) return null;

  const redPlayers = lobby.players.filter((p) => p.team === Team.RED);
  const bluePlayers = lobby.players.filter((p) => p.team === Team.BLUE);
  const unassigned = lobby.players.filter((p) => p.team === null);

  const handlePickTeam = (team: Team, role: Role) => {
    getSocket().emit("client:pick-team", { team, role });
  };

  const handleStart = () => {
    getSocket().emit("client:start-game");
  };

  const handleUpdateSettings = (timerEnabled: boolean, timerDuration: number) => {
    getSocket().emit("client:update-settings", { timerEnabled, timerDuration });
  };

  const canStart = redPlayers.length > 0 && bluePlayers.length > 0
    && redPlayers.some((p) => p.role === Role.SPYMASTER)
    && bluePlayers.some((p) => p.role === Role.SPYMASTER);

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Room Code */}
        <div className="text-center mb-6">
          <p className="text-parchment-dark text-xs sm:text-sm mb-1">ROOM CODE</p>
          <div className="bg-parchment inline-block px-6 sm:px-8 py-3 rounded-xl shadow-lg">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.3em] text-wood-dark select-all">
              {player.roomCode}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <TeamPanel
            team={Team.RED}
            players={redPlayers}
            myName={player.displayName}
            onPickTeam={handlePickTeam}
          />
          <TeamPanel
            team={Team.BLUE}
            players={bluePlayers}
            myName={player.displayName}
            onPickTeam={handlePickTeam}
          />
        </div>

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="bg-parchment rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">UNASSIGNED</h3>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((p) => (
                <span key={p.displayName} className="bg-white px-3 py-1.5 rounded-full text-sm font-medium">
                  {p.displayName} {p.isHost && "👑"}
                  {!p.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Settings (host only) */}
        {player.isHost && (
          <div className="bg-parchment rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">GAME SETTINGS</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lobby.timerEnabled}
                  onChange={(e) => handleUpdateSettings(e.target.checked, lobby.timerDuration)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium">Turn Timer</span>
              </label>
              {lobby.timerEnabled && (
                <select
                  value={lobby.timerDuration}
                  onChange={(e) => handleUpdateSettings(true, Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border bg-white text-sm font-medium"
                >
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                  <option value={180}>180s</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Start Button (host only) */}
        {player.isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-bold text-lg sm:text-xl transition-all active:scale-95
                       ${canStart
                         ? "bg-confirm text-white shadow-lg shadow-confirm/30 hover:bg-confirm-dark"
                         : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
          >
            {canStart ? "START GAME" : "Each team needs a spymaster"}
          </button>
        )}
      </div>
    </div>
  );
}

function TeamPanel({
  team,
  players,
  myName,
  onPickTeam,
}: {
  team: Team;
  players: Player[];
  myName: string;
  onPickTeam: (team: Team, role: Role) => void;
}) {
  const isRed = team === Team.RED;
  const bgClass = isRed ? "bg-team-red-bg border-2 border-team-red/20" : "bg-team-blue-bg border-2 border-team-blue/20";
  const headerClass = isRed ? "text-team-red" : "text-team-blue";
  const btnClass = isRed
    ? "bg-team-red text-white shadow-md shadow-team-red/25 hover:bg-team-red-dark active:scale-95"
    : "bg-team-blue text-white shadow-md shadow-team-blue/25 hover:bg-team-blue-dark active:scale-95";

  const spymaster = players.find((p) => p.role === Role.SPYMASTER);
  const operatives = players.filter((p) => p.role === Role.OPERATIVE);
  const iAmOnThisTeam = players.some((p) => p.displayName === myName);

  return (
    <div className={`${bgClass} rounded-xl p-3 sm:p-4`}>
      <h2 className={`${headerClass} font-bold text-base sm:text-lg mb-3`}>
        {isRed ? "RED TEAM" : "BLUE TEAM"}
      </h2>

      {/* Spymaster slot */}
      <div className="mb-3">
        <p className="text-[10px] sm:text-xs text-gray-500 mb-1 font-semibold">SPYMASTER</p>
        {spymaster ? (
          <div className="bg-white px-3 py-2.5 rounded-lg text-sm font-semibold shadow-sm">
            🕵️ {spymaster.displayName}
            {!spymaster.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
          </div>
        ) : (
          <button
            onClick={() => onPickTeam(team, Role.SPYMASTER)}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-bold ${btnClass} transition-all`}
          >
            Join as Spymaster
          </button>
        )}
      </div>

      {/* Operatives */}
      <div>
        <p className="text-[10px] sm:text-xs text-gray-500 mb-1 font-semibold">OPERATIVES</p>
        <div className="space-y-1.5">
          {operatives.map((p) => (
            <div key={p.displayName} className="bg-white px-3 py-2.5 rounded-lg text-sm font-medium shadow-sm">
              🔍 {p.displayName}
              {!p.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
            </div>
          ))}
          {!iAmOnThisTeam && (
            <button
              onClick={() => onPickTeam(team, Role.OPERATIVE)}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-bold ${btnClass} transition-all`}
            >
              Join as Operative
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
