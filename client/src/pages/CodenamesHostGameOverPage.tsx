import { useGame } from "../context/GameContext";
import { getSocket } from "../socket";
import { CardType, Team } from "shared/types";

export function CodenamesHostGameOverPage() {
  const { state } = useGame();
  const gameOver = state.gameOver;
  const display = state.codenamesHostDisplay;

  if (!gameOver) return null;

  const isAssassin = gameOver.reason === "ASSASSIN";
  const isForcedEnd = gameOver.reason === "FORCE_END";

  const handleRematch = () => {
    getSocket().emit("client:rematch");
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-linear-to-br from-purple-950/20 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-6 py-8">
        {/* Winner Banner */}
        <div className="text-center mb-10">
          {isForcedEnd ? (
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold text-gray-400">
              GAME ENDED
            </h1>
          ) : (
            <>
              <h1 className={`font-display text-5xl sm:text-6xl lg:text-8xl font-bold
                ${gameOver.winner === Team.RED ? "text-red-400" : "text-blue-400"}`}>
                {gameOver.winner === Team.RED ? "RED" : "BLUE"} WINS!
              </h1>
              {isAssassin && (
                <p className="text-xl text-gray-400 mt-4">
                  {gameOver.stats.assassinHitBy === Team.RED ? "Red" : "Blue"} team hit the assassin!
                </p>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-10">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{gameOver.stats.turnsPlayed}</div>
            <div className="text-sm text-gray-500">Turns Played</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-400">{gameOver.stats.redRemaining}</div>
            <div className="text-sm text-gray-500">Red Left</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400">{gameOver.stats.blueRemaining}</div>
            <div className="text-sm text-gray-500">Blue Left</div>
          </div>
        </div>

        {/* Revealed Board */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-4xl mb-10">
          {gameOver.board.map((card) => {
            const getColor = () => {
              switch (card.type) {
                case CardType.RED: return "bg-red-600 text-white";
                case CardType.BLUE: return "bg-blue-600 text-white";
                case CardType.ASSASSIN: return "bg-gray-800 text-white";
                case CardType.NEUTRAL: return "bg-gray-600 text-white";
                default: return "bg-gray-700";
              }
            };

            return (
              <div
                key={card.position}
                className={`${getColor()} rounded-lg p-2 text-center aspect-[5/3]
                           flex items-center justify-center
                           ${card.revealed ? "opacity-50 ring-2 ring-white/20" : "shadow-md"}`}
              >
                <span className="text-xs sm:text-sm font-bold font-display">{card.word}</span>
              </div>
            );
          })}
        </div>

        {/* Game Log */}
        {display && display.log.length > 0 && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 w-full max-w-2xl mb-8
                          max-h-48 overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Game Log</h3>
            <div className="space-y-1 text-xs">
              {display.log.map((entry, i) => (
                <div key={i} className="py-1 border-b border-gray-800 last:border-0">
                  <span className={`font-bold ${entry.team === Team.RED ? "text-red-400" : "text-blue-400"}`}>
                    [{entry.team}]
                  </span>{" "}
                  {entry.type === "CLUE" && (
                    <span className="text-gray-300">Clue: <strong>{entry.details.clue?.word}</strong> {entry.details.clue?.number}</span>
                  )}
                  {entry.type === "GUESS_CORRECT" && <span className="text-green-400">&#x2713; {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_WRONG" && <span className="text-yellow-400">&#x2717; {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_ASSASSIN" && <span className="text-red-400 font-bold">&#x2620; {entry.details.cardWord}</span>}
                  {entry.type === "PASS" && <span className="text-gray-500">Passed</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rematch */}
        <button
          onClick={handleRematch}
          className="px-12 py-5 bg-green-600 text-white rounded-2xl font-bold text-xl
                     shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-95 transition-all"
        >
          REMATCH
        </button>
      </div>
    </div>
  );
}
