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
    <div className="min-h-screen bg-felt p-4">
      <div className="max-w-4xl mx-auto">
        {/* Room Code */}
        <div className="text-center mb-6">
          <p className="text-parchment-dark text-sm mb-1">ROOM CODE</p>
          <div className="bg-parchment inline-block px-8 py-3 rounded-xl">
            <span className="font-mono text-4xl font-bold tracking-[0.3em] text-wood-dark">
              {player.roomCode}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4 mb-6">
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
          <div className="bg-parchment rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">UNASSIGNED</h3>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((p) => (
                <span key={p.displayName} className="bg-white px-3 py-1 rounded-full text-sm">
                  {p.displayName} {p.isHost && "👑"}
                  {!p.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Settings (host only) */}
        {player.isHost && (
          <div className="bg-parchment rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">GAME SETTINGS</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lobby.timerEnabled}
                  onChange={(e) => handleUpdateSettings(e.target.checked, lobby.timerDuration)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Turn Timer</span>
              </label>
              {lobby.timerEnabled && (
                <select
                  value={lobby.timerDuration}
                  onChange={(e) => handleUpdateSettings(true, Number(e.target.value))}
                  className="px-3 py-1 rounded border bg-white text-sm"
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
            className="w-full py-4 bg-wood text-white rounded-xl font-bold text-xl
                       hover:bg-wood-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
  const bgClass = isRed ? "bg-team-red-bg" : "bg-team-blue-bg";
  const headerClass = isRed ? "text-team-red" : "text-team-blue";
  const btnClass = isRed
    ? "bg-team-red text-white hover:bg-team-red-light"
    : "bg-team-blue text-white hover:bg-team-blue-light";

  const spymaster = players.find((p) => p.role === Role.SPYMASTER);
  const operatives = players.filter((p) => p.role === Role.OPERATIVE);
  const iAmOnThisTeam = players.some((p) => p.displayName === myName);

  return (
    <div className={`${bgClass} rounded-xl p-4`}>
      <h2 className={`${headerClass} font-bold text-lg mb-3`}>
        {isRed ? "RED TEAM" : "BLUE TEAM"}
      </h2>

      {/* Spymaster slot */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">SPYMASTER</p>
        {spymaster ? (
          <div className="bg-white px-3 py-2 rounded-lg text-sm font-medium">
            🕵️ {spymaster.displayName}
            {!spymaster.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
          </div>
        ) : (
          <button
            onClick={() => onPickTeam(team, Role.SPYMASTER)}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${btnClass} transition-colors`}
          >
            Join as Spymaster
          </button>
        )}
      </div>

      {/* Operatives */}
      <div>
        <p className="text-xs text-gray-500 mb-1">OPERATIVES</p>
        <div className="space-y-1">
          {operatives.map((p) => (
            <div key={p.displayName} className="bg-white px-3 py-2 rounded-lg text-sm">
              🔍 {p.displayName}
              {!p.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
            </div>
          ))}
          {!iAmOnThisTeam && (
            <button
              onClick={() => onPickTeam(team, Role.OPERATIVE)}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${btnClass} transition-colors`}
            >
              Join as Operative
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
