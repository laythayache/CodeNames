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
                  {p.displayName}
                  {!p.isConnected && <span className="text-red-400 ml-1">(offline)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Settings info (read-only for players) */}
        <div className="bg-parchment rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-center">
          <p className="text-sm text-gray-500">
            Timer: {lobby.timerEnabled ? `${lobby.timerDuration}s per turn` : "Off"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Waiting for the host to start the game...</p>
        </div>
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
            &#x1F575;&#xFE0F; {spymaster.displayName}
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
              &#x1F50D; {p.displayName}
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
