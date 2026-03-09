import { useState } from "react";
import { useGame } from "../context/GameContext";
import { getSocket } from "../socket";
import {
  CardType, Team, TurnPhase, GamePhase, Role,
  type CardPayload, type CodenamesHostDisplayPayload, type Player,
} from "shared/types";
import { AvatarDisplay } from "../components/Avatar";

export function CodenamesHostGamePage() {
  const { state } = useGame();
  const display = state.codenamesHostDisplay;

  if (!display) return null;

  const isPaused = display.phase === GamePhase.PAUSED;
  const isRedTurn = display.currentTurn === Team.RED;

  const redPlayers = display.players.filter((p) => p.team === Team.RED);
  const bluePlayers = display.players.filter((p) => p.team === Team.BLUE);

  return (
    <div className="h-dvh bg-gray-950 text-white overflow-hidden flex flex-col">
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-4">GAME PAUSED</h2>
            <button
              onClick={() => getSocket().emit("client:admin-pause")}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 active:scale-95 transition-all"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Top Bar — scores + turn + timer */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <ScoreBlock team={Team.RED} remaining={display.redRemaining} isActive={isRedTurn} />

        <div className="flex items-center gap-3">
          <div className={`px-5 py-2 rounded-xl font-bold text-sm
            ${isRedTurn ? "bg-red-600/80 text-white" : "bg-blue-600/80 text-white"}`}>
            {isRedTurn ? "RED" : "BLUE"}'s turn
            {" \u2014 "}
            {display.turnPhase === TurnPhase.GIVING_CLUE ? "giving clue" : "guessing"}
          </div>

          {state.timerSeconds !== null && (
            <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl
              ${state.timerSeconds <= 10
                ? "text-red-400 bg-red-950/50 border border-red-600/50 animate-pulse"
                : "text-white bg-gray-900/80 border border-gray-800"
              }`}>
              {Math.floor(state.timerSeconds / 60)}:{(state.timerSeconds % 60).toString().padStart(2, "0")}
            </div>
          )}

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-2">
            <span className="text-gray-500 text-xs font-bold">ROOM</span>
            <span className="text-purple-400 text-sm font-mono font-bold ml-2">{display.roomCode}</span>
          </div>
        </div>

        <ScoreBlock team={Team.BLUE} remaining={display.blueRemaining} isActive={!isRedTurn} />
      </div>

      {/* Clue display */}
      {display.currentClue && (
        <div className={`mx-4 text-center py-2 rounded-xl border shrink-0
          ${display.currentClue.team === Team.RED
            ? "bg-red-950/30 border-red-800/50"
            : "bg-blue-950/30 border-blue-800/50"
          }`}>
          <span className="text-gray-400 text-xs font-bold mr-3">CLUE:</span>
          <span className="text-3xl font-bold text-white font-display">
            {display.currentClue.word}
          </span>
          <span className="text-2xl font-bold text-gray-400 ml-3">
            {display.currentClue.number}
          </span>
          <span className="text-sm text-gray-500 ml-4">
            by {display.currentClue.spymaster} | {display.guessesRemaining} left
          </span>
        </div>
      )}

      {/* Main content: board + team panels */}
      <div className="flex-1 flex min-h-0 px-4 py-2 gap-3">
        {/* Left panel — Red team */}
        <TeamPanel team={Team.RED} players={redPlayers} isActive={isRedTurn} />

        {/* Board — fits available space */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="grid grid-cols-5 gap-1.5 w-full max-w-4xl" style={{ maxHeight: "100%" }}>
            {display.board.map((card) => (
              <HostCard
                key={card.position}
                card={card}
                votes={display.votes[card.position] || []}
              />
            ))}
          </div>
        </div>

        {/* Right panel — Blue team */}
        <TeamPanel team={Team.BLUE} players={bluePlayers} isActive={!isRedTurn} />
      </div>

      {/* Admin Controls */}
      <div className="shrink-0 px-4 pb-3">
        <HostAdminBar display={display} isPaused={isPaused} />
      </div>
    </div>
  );
}

function ScoreBlock({ team, remaining, isActive }: {
  team: Team;
  remaining: number;
  isActive: boolean;
}) {
  const isRed = team === Team.RED;
  return (
    <div className={`text-center px-5 py-2 rounded-xl border transition-all
      ${isActive
        ? isRed ? "bg-red-900/40 border-red-600/50 shadow-lg shadow-red-600/20" : "bg-blue-900/40 border-blue-600/50 shadow-lg shadow-blue-600/20"
        : "bg-gray-900/60 border-gray-800"
      }`}>
      <div className={`text-xs font-bold uppercase tracking-wider
        ${isRed ? "text-red-400" : "text-blue-400"}`}>
        {isRed ? "RED" : "BLUE"}
      </div>
      <div className={`text-3xl font-bold
        ${isRed ? "text-red-400" : "text-blue-400"}`}>
        {remaining}
      </div>
    </div>
  );
}

function TeamPanel({ team, players, isActive }: {
  team: Team;
  players: Player[];
  isActive: boolean;
}) {
  const isRed = team === Team.RED;
  const spymaster = players.find((p) => p.role === Role.SPYMASTER);
  const operatives = players.filter((p) => p.role === Role.OPERATIVE);

  return (
    <div className={`w-40 shrink-0 rounded-xl border p-3 flex flex-col gap-2 overflow-y-auto
      ${isActive
        ? isRed ? "bg-red-950/20 border-red-800/40" : "bg-blue-950/20 border-blue-800/40"
        : "bg-gray-900/40 border-gray-800/40"
      }`}>
      <h3 className={`text-[10px] font-bold uppercase tracking-wider
        ${isRed ? "text-red-400" : "text-blue-400"}`}>
        {isRed ? "RED" : "BLUE"} TEAM
      </h3>

      {spymaster && (
        <div className="flex items-center gap-1.5">
          {spymaster.avatar && <AvatarDisplay avatar={spymaster.avatar} size={24} />}
          <div>
            <div className="text-xs font-bold text-white leading-tight">{spymaster.displayName}</div>
            <div className={`text-[9px] ${isRed ? "text-red-400" : "text-blue-400"}`}>Spymaster</div>
          </div>
        </div>
      )}

      {operatives.map((p) => (
        <div key={p.displayName} className="flex items-center gap-1.5">
          {p.avatar && <AvatarDisplay avatar={p.avatar} size={24} />}
          <span className="text-xs text-gray-300">{p.displayName}</span>
        </div>
      ))}
    </div>
  );
}

function HostCard({ card, votes }: {
  card: CardPayload;
  votes: string[];
}) {
  const getCardStyle = () => {
    if (card.revealed) {
      switch (card.type) {
        case CardType.RED: return "bg-red-600/60 text-white/60 border-red-500/30";
        case CardType.BLUE: return "bg-blue-600/60 text-white/60 border-blue-500/30";
        case CardType.ASSASSIN: return "bg-gray-800/60 text-gray-400 border-gray-600/30";
        case CardType.NEUTRAL: return "bg-gray-700/40 text-gray-400 border-gray-600/30";
        default: return "bg-gray-800/40 border-gray-700";
      }
    }
    // Unrevealed — plain card, no type info
    return "bg-parchment text-gray-800 border border-amber-700/30 shadow";
  };

  const hasVotes = votes.length > 0 && !card.revealed;

  return (
    <div className={`relative rounded-lg flex items-center justify-center aspect-[5/3]
                     transition-all ${getCardStyle()}
                     ${card.revealed ? "opacity-40 scale-[0.97]" : ""}
                     ${hasVotes ? "ring-[3px] ring-yellow-400 shadow-yellow-400/30" : ""}`}>
      <span className={`text-xs sm:text-sm lg:text-base font-bold font-display text-center px-1 leading-tight
                        ${card.revealed ? "line-through opacity-70" : ""}`}>
        {card.word}
      </span>

      {/* Vote indicators */}
      {hasVotes && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {votes.map((voter) => (
            <div
              key={voter}
              title={voter}
              className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-500
                         text-[8px] font-bold flex items-center justify-center text-yellow-900 shadow"
            >
              {voter[0]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HostAdminBar({ display, isPaused }: {
  display: CodenamesHostDisplayPayload;
  isPaused: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 text-xs font-bold bg-gray-900/80 text-gray-500 rounded-lg
                   hover:bg-gray-800 active:scale-[0.99] transition-all border border-gray-800"
      >
        {expanded ? "Hide Admin" : "Admin"}
      </button>
      {expanded && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 mt-1 flex gap-2 flex-wrap items-center">
          <button
            onClick={() => getSocket().emit("client:admin-pause")}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-xs font-bold
                       hover:bg-yellow-700 active:scale-95 transition-all"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => getSocket().emit("client:admin-skip-turn")}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold
                       hover:bg-orange-700 active:scale-95 transition-all"
          >
            Skip Turn
          </button>
          <button
            onClick={() => {
              if (confirm("End the game?")) {
                getSocket().emit("client:admin-end-game");
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold
                       hover:bg-red-700 active:scale-95 transition-all"
          >
            End Game
          </button>
          <select
            onChange={(e) => {
              if (e.target.value && confirm(`Kick ${e.target.value}?`)) {
                getSocket().emit("client:admin-kick", { displayName: e.target.value });
              }
              e.target.value = "";
            }}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white"
            defaultValue=""
          >
            <option value="" disabled>Kick...</option>
            {display.players.map((p) => (
              <option key={p.displayName} value={p.displayName}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
