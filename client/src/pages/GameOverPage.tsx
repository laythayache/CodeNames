import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { CardType, Team } from "shared/types";

export function GameOverPage() {
  const { state } = useGame();
  const player = usePlayer();
  const gameOver = state.gameOver;
  const gs = state.gameState;

  if (!gameOver) return null;

  const board = gameOver.board;
  const stats = gameOver.stats;
  const isAssassin = gameOver.reason === "ASSASSIN";
  const isForcedEnd = gameOver.reason === "FORCE_END";

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-parchment rounded-2xl p-6 sm:p-8 text-center mb-4 sm:mb-6 shadow-lg">
          {isForcedEnd ? (
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-600 font-display">
              Game Ended
            </h1>
          ) : (
            <>
              <h1
                className={`text-3xl sm:text-4xl font-bold font-display
                  ${gameOver.winner === Team.RED ? "text-team-red" : "text-team-blue"}`}
              >
                {gameOver.winner === Team.RED ? "RED" : "BLUE"} TEAM WINS!
              </h1>
              {isAssassin && (
                <p className="text-base sm:text-lg text-gray-600 mt-2">
                  {stats.assassinHitBy === Team.RED ? "Red" : "Blue"} team hit the assassin!
                </p>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs font-bold text-gray-500 mb-4">GAME STATS</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-wood-dark">{stats.turnsPlayed}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Turns Played</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-team-red">{stats.redRemaining}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Red Left</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-team-blue">{stats.blueRemaining}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Blue Left</div>
            </div>
          </div>
        </div>

        {/* Revealed Board */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4 sm:mb-6">
          {board.map((card) => {
            const getColor = () => {
              switch (card.type) {
                case CardType.RED: return "bg-team-red text-white";
                case CardType.BLUE: return "bg-team-blue text-white";
                case CardType.ASSASSIN: return "bg-card-assassin text-white";
                case CardType.NEUTRAL: return "bg-card-neutral text-white";
                default: return "bg-white";
              }
            };

            return (
              <div
                key={card.position}
                className={`${getColor()} rounded-md sm:rounded-lg p-1 sm:p-2 text-center
                           min-h-10 sm:min-h-0 sm:aspect-4/3
                           flex items-center justify-center
                           ${card.revealed ? "opacity-50 ring-2 ring-white/30" : "shadow-sm"}`}
              >
                <span className="text-[9px] sm:text-sm font-bold font-display break-all">
                  {card.word}
                </span>
              </div>
            );
          })}
        </div>

        {/* Game Log */}
        {gs && gs.log.length > 0 && (
          <div className="bg-parchment rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-xs font-bold text-gray-500 mb-2">GAME LOG</h3>
            <div className="space-y-1 text-xs sm:text-sm max-h-48 sm:max-h-60 overflow-y-auto">
              {gs.log.map((entry, i) => (
                <div key={i} className="py-1 border-b border-parchment-dark last:border-0">
                  <span className={`font-bold ${entry.team === Team.RED ? "text-team-red" : "text-team-blue"}`}>
                    [{entry.team}]
                  </span>{" "}
                  {entry.type === "CLUE" && (
                    <span>Clue: <strong>{entry.details.clue?.word}</strong> {entry.details.clue?.number}</span>
                  )}
                  {entry.type === "GUESS_CORRECT" && <span className="text-confirm font-semibold">&#x2713; {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_WRONG" && <span className="text-warning-dark font-semibold">&#x2717; {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_ASSASSIN" && <span className="text-danger font-bold">&#x2620; {entry.details.cardWord}</span>}
                  {entry.type === "PASS" && <span className="text-gray-500">Passed</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for host */}
        <div className="bg-parchment rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Waiting for host to start a new game...</p>
        </div>
      </div>
    </div>
  );
}
