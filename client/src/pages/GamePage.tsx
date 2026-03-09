import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import {
  type CardPayload, CardType, GamePhase, Role, Team, TurnPhase,
} from "shared/types";

export function GamePage() {
  const { state } = useGame();
  const player = usePlayer();
  const gs = state.gameState;
  const [showLog, setShowLog] = useState(false);

  if (!gs) return null;

  const isMyTurn = gs.currentTurn === player.team;
  const isSpymaster = player.role === Role.SPYMASTER;
  const isGuessing = gs.turnPhase === TurnPhase.GUESSING;
  const isPaused = gs.phase === GamePhase.PAUSED;

  return (
    <div className="min-h-dvh bg-felt p-1.5 sm:p-3 flex flex-col">
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-parchment px-8 sm:px-12 py-8 rounded-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-wood-dark">GAME PAUSED</h2>
            <p className="text-gray-500 mt-2">Waiting for host to resume...</p>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      <ProgressTracker gs={gs} timerSeconds={state.timerSeconds} />

      {/* Main content */}
      <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
        {/* Board + controls */}
        <div className="flex-1 flex flex-col min-w-0">
          <Board
            board={gs.board}
            votes={state.votes}
            canVote={isMyTurn && isGuessing && (!isSpymaster || isOneVOneMode(gs))}
            isPaused={isPaused}
          />

          {/* Clue Input / Display */}
          <div className="mt-2 space-y-2">
            {isMyTurn && gs.turnPhase === TurnPhase.GIVING_CLUE && isSpymaster && (
              <ClueInput />
            )}
            {gs.currentClue && (
              <ClueDisplay clue={gs.currentClue} guessesRemaining={gs.guessesRemaining} />
            )}
            {isMyTurn && isGuessing && (!isSpymaster || isOneVOneMode(gs)) && (
              <GuessControls votes={state.votes} gs={gs} />
            )}
          </div>

          {/* Spymaster Toggle */}
          {isSpymaster && <SpymasterToggle />}
        </div>

        {/* Game Log — sidebar on desktop, toggle on mobile */}
        <div className="sm:hidden mt-2">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full py-2 bg-parchment rounded-lg text-sm font-semibold text-gray-600 active:scale-95 transition-all"
          >
            {showLog ? "Hide Game Log" : "Show Game Log"}
          </button>
          {showLog && <GameLog log={gs.log} />}
        </div>
        <div className="hidden sm:block">
          <GameLog log={gs.log} />
        </div>
      </div>

      {/* Admin Panel */}
      {player.isHost && <AdminPanel isPaused={isPaused} gs={gs} />}
    </div>
  );
}

function isOneVOneMode(gs: {
  currentTurn: Team;
  players: { team: Team | null; role: Role | null; isConnected: boolean }[];
}): boolean {
  return gs.players.filter(
    (p) => p.team === gs.currentTurn && p.role === Role.OPERATIVE && p.isConnected
  ).length === 0;
}

// ── Sub-Components ──

function ProgressTracker({ gs, timerSeconds }: {
  gs: NonNullable<ReturnType<typeof useGame>["state"]["gameState"]>;
  timerSeconds: number | null;
}) {
  const isRedTurn = gs.currentTurn === Team.RED;

  return (
    <div className="bg-parchment rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
      {/* Mobile: stacked layout */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 font-semibold">RED</div>
            <div className="text-xl sm:text-2xl font-bold text-team-red">{gs.redRemaining}</div>
          </div>
          <div className={`px-3 sm:px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold
                          ${isRedTurn ? "bg-team-red shadow-md shadow-team-red/30" : "bg-team-blue shadow-md shadow-team-blue/30"}`}>
            <span className="hidden sm:inline">
              {isRedTurn ? "RED" : "BLUE"}'s turn — {gs.turnPhase === TurnPhase.GIVING_CLUE ? "giving clue" : "guessing"}
            </span>
            <span className="sm:hidden">
              {isRedTurn ? "RED" : "BLUE"} — {gs.turnPhase === TurnPhase.GIVING_CLUE ? "clue" : "guess"}
            </span>
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 font-semibold">BLUE</div>
            <div className="text-xl sm:text-2xl font-bold text-team-blue">{gs.blueRemaining}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {gs.currentClue && (
            <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
              Guesses: <span className="font-bold">{gs.guessesRemaining}</span>
            </div>
          )}

          {timerSeconds !== null && (
            <div className={`text-lg sm:text-xl font-mono font-bold px-2 py-0.5 rounded-lg
                            ${timerSeconds <= 10 ? "text-white bg-team-red animate-pulse" : "text-gray-700 bg-parchment-dark"}`}>
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Board({
  board, votes, canVote, isPaused,
}: {
  board: CardPayload[];
  votes: Record<number, string[]>;
  canVote: boolean;
  isPaused: boolean;
}) {
  const handleVote = (position: number) => {
    if (!canVote || isPaused) return;
    getSocket().emit("client:vote-card", { position });
  };

  return (
    <div className="grid grid-cols-5 gap-0.75 sm:gap-1.5 md:gap-2 w-full"
         style={{ gridAutoRows: "1fr" }}>
      {board.map((card) => (
        <CardComponent
          key={card.position}
          card={card}
          votes={votes[card.position] || []}
          canClick={canVote && !card.revealed}
          onClick={() => handleVote(card.position)}
        />
      ))}
    </div>
  );
}

function CardComponent({
  card, votes, canClick, onClick,
}: {
  card: CardPayload;
  votes: string[];
  canClick: boolean;
  onClick: () => void;
}) {
  const getCardColor = (type?: CardType) => {
    switch (type) {
      case CardType.RED: return "bg-team-red text-white";
      case CardType.BLUE: return "bg-team-blue text-white";
      case CardType.ASSASSIN: return "bg-card-assassin text-white";
      case CardType.NEUTRAL: return "bg-card-neutral text-white";
      default: return "bg-parchment";
    }
  };

  const getSpymasterColor = (type?: CardType) => {
    switch (type) {
      case CardType.RED: return "bg-team-red/25 text-team-red-dark border-2 border-team-red";
      case CardType.BLUE: return "bg-team-blue/25 text-team-blue-dark border-2 border-team-blue";
      case CardType.ASSASSIN: return "bg-card-assassin/20 text-card-assassin border-2 border-card-assassin";
      case CardType.NEUTRAL: return "bg-card-neutral/20 border-2 border-card-neutral";
      default: return "bg-parchment border border-parchment-dark";
    }
  };

  const isRevealed = card.revealed;
  const hasSpymasterType = !isRevealed && card.type !== undefined;

  const colorClass = isRevealed
    ? getCardColor(card.type)
    : hasSpymasterType
      ? getSpymasterColor(card.type)
      : "bg-parchment border border-parchment-dark";

  const hasVotes = votes.length > 0 && !isRevealed;

  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={`relative rounded-md sm:rounded-lg flex items-center justify-center
                  aspect-5/3 sm:aspect-4/3
                  transition-all duration-300 font-display
                  ${colorClass}
                  ${canClick ? "cursor-pointer active:scale-[0.92] sm:hover:scale-105 sm:hover:shadow-xl" : "cursor-default"}
                  ${isRevealed ? "opacity-70 scale-[0.97]" : "shadow-md"}
                  ${hasVotes ? "ring-[3px] ring-yellow-400 shadow-yellow-400/40 shadow-lg" : ""}`}
    >
      <span className={`text-[9px] leading-[1.1] sm:text-xs md:text-sm font-bold text-center px-0.5
                        ${isRevealed && card.type === CardType.NEUTRAL ? "text-gray-700" : ""}
                        ${isRevealed ? "line-through decoration-1 opacity-80" : ""}`}>
        {card.word}
      </span>

      {/* Vote indicators */}
      {hasVotes && (
        <div className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          {votes.map((voter) => (
            <div
              key={voter}
              title={voter}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-400 border-2 border-yellow-500
                         text-[7px] sm:text-[9px] font-bold flex items-center justify-center text-yellow-900
                         shadow-sm"
            >
              {voter[0]}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

function ClueInput() {
  const [word, setWord] = useState("");
  const [number, setNumber] = useState(1);

  const handleSubmit = () => {
    if (!word.trim()) return;
    getSocket().emit("client:give-clue", { word: word.trim(), number });
    setWord("");
    setNumber(1);
  };

  return (
    <div className="bg-parchment rounded-xl p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="flex-1">
        <label className="text-xs font-semibold text-gray-500">YOUR CLUE</label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter clue..."
          className="w-full px-3 py-2.5 rounded-lg border-2 border-parchment-dark bg-white
                     focus:border-wood focus:outline-none text-base"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>
      <div className="flex gap-2">
        <div className="w-20">
          <label className="text-xs font-semibold text-gray-500">NUMBER</label>
          <select
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="w-full px-2 py-2.5 rounded-lg border-2 border-parchment-dark bg-white"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!word.trim()}
          className="px-5 py-2.5 bg-wood text-white rounded-lg font-bold text-base self-end
                     shadow-lg shadow-wood/30 hover:bg-wood-dark active:scale-95
                     transition-all disabled:opacity-40 disabled:shadow-none"
        >
          Give Clue
        </button>
      </div>
    </div>
  );
}

function ClueDisplay({ clue, guessesRemaining }: {
  clue: { word: string; number: number; team: Team; spymaster: string };
  guessesRemaining: number;
}) {
  const isRed = clue.team === Team.RED;
  const bgClass = isRed ? "bg-team-red-bg border-2 border-team-red/20" : "bg-team-blue-bg border-2 border-team-blue/20";
  const textClass = isRed ? "text-team-red" : "text-team-blue";

  return (
    <div className={`${bgClass} rounded-xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-4 flex-wrap`}>
      <span className="text-[10px] sm:text-xs text-gray-500 font-semibold">CLUE:</span>
      <span className={`font-bold text-lg sm:text-xl ${textClass} font-display`}>
        {clue.word}
      </span>
      <span className={`${textClass} font-bold text-base sm:text-lg bg-white/50 px-2 py-0.5 rounded-md`}>
        {clue.number}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 ml-auto">
        by {clue.spymaster} | {guessesRemaining} left
      </span>
    </div>
  );
}

function GuessControls({
  votes, gs,
}: {
  votes: Record<number, string[]>;
  gs: NonNullable<ReturnType<typeof useGame>["state"]["gameState"]>;
}) {
  let maxPos = -1;
  let maxVotes = 0;
  for (const [pos, voters] of Object.entries(votes)) {
    if (voters.length > maxVotes) {
      maxVotes = voters.length;
      maxPos = Number(pos);
    }
  }

  const operativeCount = gs.players.filter(
    (p) => p.team === gs.currentTurn && p.role === Role.OPERATIVE && p.isConnected
  ).length;
  const threshold = operativeCount === 0 ? 1 : Math.ceil(operativeCount / 2);
  const hasMajority = maxVotes >= threshold;

  const handleConfirm = () => {
    if (hasMajority && maxPos >= 0) {
      getSocket().emit("client:confirm-guess", { position: maxPos });
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleConfirm}
        disabled={!hasMajority}
        className={`flex-1 py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95
                    ${hasMajority
                      ? "bg-confirm shadow-lg shadow-confirm/30 hover:bg-confirm-dark animate-pulse"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"}`}
      >
        {hasMajority
          ? `Confirm: ${gs.board[maxPos]?.word}`
          : `Votes: ${maxVotes}/${threshold}`}
      </button>
      <button
        onClick={() => getSocket().emit("client:pass-turn")}
        className="px-5 sm:px-6 py-3 bg-pass text-white rounded-xl font-bold text-base
                   shadow-md hover:bg-pass-dark active:scale-95 transition-all"
      >
        Pass
      </button>
    </div>
  );
}

function SpymasterToggle() {
  const [showOperativeView, setShowOperativeView] = useState(false);

  return (
    <div className="mt-2 text-center">
      <button
        onClick={() => setShowOperativeView(!showOperativeView)}
        className="px-4 py-2 text-sm bg-parchment text-gray-600 rounded-full font-semibold
                   hover:bg-parchment-dark active:scale-95 transition-all"
      >
        {showOperativeView ? "Show Spymaster View" : "Show Operative View"}
      </button>
    </div>
  );
}

function GameLog({ log }: { log: any[] }) {
  return (
    <div className="w-full sm:w-56 md:w-64 bg-parchment rounded-xl p-3 overflow-y-auto max-h-[40vh] sm:max-h-[80vh] mt-2 sm:mt-0">
      <h3 className="text-xs font-bold text-gray-500 mb-2">GAME LOG</h3>
      <div className="space-y-1 text-xs">
        {log.length === 0 && <p className="text-gray-400 italic">No events yet...</p>}
        {[...log].reverse().map((entry, i) => (
          <div key={i} className="py-1.5 border-b border-parchment-dark last:border-0">
            <span className={`font-bold ${entry.team === "RED" ? "text-team-red" : "text-team-blue"}`}>
              [{entry.team}]
            </span>{" "}
            {entry.type === "CLUE" && (
              <span>Clue: <strong>{entry.details.clue?.word}</strong> {entry.details.clue?.number}</span>
            )}
            {entry.type === "GUESS_CORRECT" && (
              <span className="text-confirm font-semibold">✓ {entry.details.cardWord}</span>
            )}
            {entry.type === "GUESS_WRONG" && (
              <span className="text-warning-dark font-semibold">✗ {entry.details.cardWord}</span>
            )}
            {entry.type === "GUESS_ASSASSIN" && (
              <span className="text-danger font-bold">☠ {entry.details.cardWord} — ASSASSIN!</span>
            )}
            {entry.type === "PASS" && <span className="text-gray-500">Passed</span>}
            {entry.type === "TIMER_EXPIRED" && <span className="text-gray-500">Timer expired</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ isPaused, gs }: {
  isPaused: boolean;
  gs: NonNullable<ReturnType<typeof useGame>["state"]["gameState"]>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs font-bold bg-parchment/30 text-parchment rounded-lg
                   hover:bg-parchment/50 active:scale-95 transition-all"
      >
        {expanded ? "Hide Admin Controls" : "Admin Controls"}
      </button>
      {expanded && (
        <div className="bg-parchment rounded-xl p-3 mt-1 flex gap-2 flex-wrap">
          <button
            onClick={() => getSocket().emit("client:admin-pause")}
            className="px-4 py-2.5 bg-warning text-white rounded-lg text-sm font-bold
                       shadow-md shadow-warning/25 hover:bg-warning-dark active:scale-95 transition-all"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => getSocket().emit("client:admin-skip-turn")}
            className="px-4 py-2.5 bg-warning-dark text-white rounded-lg text-sm font-bold
                       shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            Skip Turn
          </button>
          <button
            onClick={() => {
              if (confirm("End the game?")) {
                getSocket().emit("client:admin-end-game");
              }
            }}
            className="px-4 py-2.5 bg-danger text-white rounded-lg text-sm font-bold
                       shadow-md shadow-danger/25 hover:bg-danger-dark active:scale-95 transition-all"
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
            className="px-3 py-2.5 rounded-lg border-2 text-sm bg-white font-medium"
            defaultValue=""
          >
            <option value="" disabled>Kick player...</option>
            {gs.players
              .filter((p) => !p.isHost)
              .map((p) => (
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
