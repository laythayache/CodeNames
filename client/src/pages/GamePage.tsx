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

  if (!gs) return null;

  const isMyTurn = gs.currentTurn === player.team;
  const isSpymaster = player.role === Role.SPYMASTER;
  const isGuessing = gs.turnPhase === TurnPhase.GUESSING;
  const isPaused = gs.phase === GamePhase.PAUSED;

  return (
    <div className="min-h-screen bg-felt p-2 sm:p-4 flex flex-col">
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-parchment px-12 py-8 rounded-2xl text-center">
            <h2 className="text-3xl font-bold text-wood-dark">GAME PAUSED</h2>
            <p className="text-gray-500 mt-2">Waiting for host to resume...</p>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      <ProgressTracker gs={gs} timerSeconds={state.timerSeconds} />

      {/* Main content */}
      <div className="flex-1 flex gap-2 sm:gap-4 mt-2">
        {/* Board */}
        <div className="flex-1 flex flex-col">
          <Board
            board={gs.board}
            votes={state.votes}
            isMyTurn={isMyTurn}
            isGuessing={isGuessing}
            canVote={isMyTurn && isGuessing && (!isSpymaster || isOneVOneMode(gs))}
            isPaused={isPaused}
          />

          {/* Clue Input / Display */}
          <div className="mt-2">
            {isMyTurn && gs.turnPhase === TurnPhase.GIVING_CLUE && isSpymaster && (
              <ClueInput />
            )}
            {gs.currentClue && (
              <ClueDisplay
                clue={gs.currentClue}
                guessesRemaining={gs.guessesRemaining}
              />
            )}
            {isMyTurn && isGuessing && (
              <div className="flex gap-2 mt-2">
                <GuessControls
                  votes={state.votes}
                  isSpymaster={isSpymaster}
                  gs={gs}
                />
              </div>
            )}
          </div>

          {/* Spymaster Toggle */}
          {isSpymaster && <SpymasterToggle />}
        </div>

        {/* Game Log Sidebar */}
        <GameLog log={gs.log} />
      </div>

      {/* Admin Panel */}
      {player.isHost && <AdminPanel isPaused={isPaused} gs={gs} />}
    </div>
  );
}

function isOneVOneMode(gs: { players: { team: Team | null; role: Role | null }[] }): boolean {
  const currentTeam = gs.players.filter((p) => p.team === (gs as any).currentTurn);
  return currentTeam.filter((p) => p.role === Role.OPERATIVE).length === 0;
}

// ── Sub-Components ──

function ProgressTracker({ gs, timerSeconds }: {
  gs: NonNullable<ReturnType<typeof useGame>["state"]["gameState"]>;
  timerSeconds: number | null;
}) {
  const isRedTurn = gs.currentTurn === Team.RED;

  return (
    <div className="bg-parchment rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-500">RED</div>
          <div className="text-2xl font-bold text-team-red">{gs.redRemaining}</div>
        </div>
        <div className={`px-4 py-1 rounded-full text-white text-sm font-semibold ${isRedTurn ? "bg-team-red" : "bg-team-blue"}`}>
          {isRedTurn ? "RED" : "BLUE"}'s turn
          {gs.turnPhase === TurnPhase.GIVING_CLUE ? " — giving clue" : " — guessing"}
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">BLUE</div>
          <div className="text-2xl font-bold text-team-blue">{gs.blueRemaining}</div>
        </div>
      </div>

      {gs.currentClue && (
        <div className="text-sm text-gray-600">
          Guesses left: <span className="font-bold">{gs.guessesRemaining}</span>
        </div>
      )}

      {timerSeconds !== null && (
        <div className={`text-xl font-mono font-bold ${timerSeconds <= 10 ? "text-team-red animate-pulse" : "text-gray-700"}`}>
          {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

function Board({
  board, votes, isMyTurn, isGuessing, canVote, isPaused,
}: {
  board: CardPayload[];
  votes: Record<number, string[]>;
  isMyTurn: boolean;
  isGuessing: boolean;
  canVote: boolean;
  isPaused: boolean;
}) {
  const handleVote = (position: number) => {
    if (!canVote || isPaused) return;
    getSocket().emit("client:vote-card", { position });
  };

  return (
    <div className="grid grid-cols-5 gap-2 flex-1">
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
  const getRevealedColor = (type?: CardType) => {
    switch (type) {
      case CardType.RED: return "bg-team-red text-white";
      case CardType.BLUE: return "bg-team-blue text-white";
      case CardType.ASSASSIN: return "bg-card-assassin text-white";
      case CardType.NEUTRAL: return "bg-card-neutral text-white";
      default: return "bg-white";
    }
  };

  const getSpymasterBorder = (type?: CardType) => {
    switch (type) {
      case CardType.RED: return "border-team-red border-3";
      case CardType.BLUE: return "border-team-blue border-3";
      case CardType.ASSASSIN: return "border-card-assassin border-3";
      default: return "border-parchment-dark border-2";
    }
  };

  const isRevealed = card.revealed;
  const hasSpymasterType = !isRevealed && card.type !== undefined;

  const colorClass = isRevealed
    ? getRevealedColor(card.type)
    : "bg-parchment";

  const borderClass = hasSpymasterType
    ? getSpymasterBorder(card.type)
    : isRevealed
      ? "border-transparent"
      : "border-parchment-dark border-2";

  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={`relative rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center
                  aspect-[4/3] transition-all duration-400 font-[family-name:var(--font-display)]
                  ${colorClass} ${borderClass}
                  ${canClick ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "cursor-default"}
                  ${isRevealed ? "opacity-80" : "shadow-md"}`}
    >
      <span className={`text-xs sm:text-sm font-bold text-center leading-tight
                        ${isRevealed && card.type === CardType.NEUTRAL ? "text-gray-700" : ""}`}>
        {card.word}
      </span>

      {/* Vote indicators */}
      {votes.length > 0 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {votes.map((voter) => (
            <div
              key={voter}
              title={voter}
              className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600 text-[6px] flex items-center justify-center"
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
    <div className="bg-parchment rounded-xl p-3 flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-xs text-gray-500">YOUR CLUE</label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter clue..."
          className="w-full px-3 py-2 rounded-lg border border-parchment-dark bg-white focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-gray-500">NUMBER</label>
        <select
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          className="w-full px-2 py-2 rounded-lg border border-parchment-dark bg-white"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!word.trim()}
        className="px-4 py-2 bg-wood text-white rounded-lg font-semibold hover:bg-wood-dark
                   transition-colors disabled:opacity-50"
      >
        Give Clue
      </button>
    </div>
  );
}

function ClueDisplay({ clue, guessesRemaining }: {
  clue: { word: string; number: number; team: Team; spymaster: string };
  guessesRemaining: number;
}) {
  const bgClass = clue.team === Team.RED ? "bg-team-red-bg" : "bg-team-blue-bg";
  const textClass = clue.team === Team.RED ? "text-team-red" : "text-team-blue";

  return (
    <div className={`${bgClass} rounded-xl px-4 py-2 flex items-center gap-4`}>
      <span className="text-xs text-gray-500">CLUE:</span>
      <span className={`font-bold text-xl ${textClass} font-[family-name:var(--font-display)]`}>
        {clue.word}
      </span>
      <span className={`${textClass} font-bold text-lg`}>{clue.number}</span>
      <span className="text-xs text-gray-500 ml-auto">by {clue.spymaster}</span>
    </div>
  );
}

function GuessControls({
  votes, isSpymaster, gs,
}: {
  votes: Record<number, string[]>;
  isSpymaster: boolean;
  gs: NonNullable<ReturnType<typeof useGame>["state"]["gameState"]>;
}) {
  // Find the card with the most votes
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

  const handlePass = () => {
    getSocket().emit("client:pass-turn");
  };

  return (
    <>
      <button
        onClick={handleConfirm}
        disabled={!hasMajority}
        className={`flex-1 py-2 rounded-lg font-semibold text-white transition-colors
                    ${hasMajority
                      ? "bg-green-600 hover:bg-green-700 animate-pulse"
                      : "bg-gray-400 cursor-not-allowed"}`}
      >
        {hasMajority
          ? `Confirm: ${gs.board[maxPos]?.word}`
          : `Waiting for votes (${maxVotes}/${threshold})`}
      </button>
      <button
        onClick={handlePass}
        className="px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold
                   hover:bg-gray-600 transition-colors"
      >
        Pass
      </button>
    </>
  );
}

function SpymasterToggle() {
  const [showOperativeView, setShowOperativeView] = useState(false);

  return (
    <div className="mt-2 text-center">
      <button
        onClick={() => setShowOperativeView(!showOperativeView)}
        className="px-4 py-1 text-sm bg-parchment text-gray-600 rounded-full
                   hover:bg-parchment-dark transition-colors"
      >
        {showOperativeView ? "Show Spymaster View" : "Show Operative View"}
      </button>
      {/* Note: actual view toggle is handled by the server's role-filtered payload.
          This is a UI-only toggle for spymasters to mentally simulate what operatives see. */}
    </div>
  );
}

function GameLog({ log }: { log: typeof import("shared/types").LogEntry extends never ? never : any[] }) {
  return (
    <div className="w-48 sm:w-64 bg-parchment rounded-xl p-3 overflow-y-auto max-h-[80vh]">
      <h3 className="text-xs font-semibold text-gray-500 mb-2">GAME LOG</h3>
      <div className="space-y-1 text-xs">
        {log.length === 0 && <p className="text-gray-400 italic">No events yet...</p>}
        {[...log].reverse().map((entry, i) => (
          <div key={i} className="py-1 border-b border-parchment-dark last:border-0">
            <span className={entry.team === "RED" ? "text-team-red" : "text-team-blue"}>
              [{entry.team}]
            </span>{" "}
            {entry.type === "CLUE" && (
              <span>Clue: <strong>{entry.details.clue?.word}</strong> {entry.details.clue?.number}</span>
            )}
            {entry.type === "GUESS_CORRECT" && (
              <span className="text-green-600">✓ {entry.details.cardWord}</span>
            )}
            {entry.type === "GUESS_WRONG" && (
              <span className="text-orange-600">✗ {entry.details.cardWord}</span>
            )}
            {entry.type === "GUESS_ASSASSIN" && (
              <span className="text-red-800">☠ {entry.details.cardWord} — ASSASSIN!</span>
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
        className="w-full py-1 text-xs text-parchment-dark hover:text-white transition-colors"
      >
        {expanded ? "▼ Hide Admin Controls" : "▲ Admin Controls"}
      </button>
      {expanded && (
        <div className="bg-parchment rounded-xl p-3 flex gap-2 flex-wrap">
          <button
            onClick={() => getSocket().emit("client:admin-pause")}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => getSocket().emit("client:admin-skip-turn")}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
          >
            Skip Turn
          </button>
          <button
            onClick={() => {
              if (confirm("End the game?")) {
                getSocket().emit("client:admin-end-game");
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
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
            className="px-3 py-2 rounded-lg border text-sm bg-white"
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
