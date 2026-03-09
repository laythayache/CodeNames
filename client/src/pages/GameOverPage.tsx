import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
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
    <div className="min-h-screen bg-felt p-4">
      <div className="max-w-4xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-parchment rounded-2xl p-8 text-center mb-6">
          {isForcedEnd ? (
            <h1 className="text-3xl font-bold text-gray-600 font-[family-name:var(--font-display)]">
              Game Ended
            </h1>
          ) : (
            <>
              <h1
                className={`text-4xl font-bold font-[family-name:var(--font-display)]
                  ${gameOver.winner === Team.RED ? "text-team-red" : "text-team-blue"}`}
              >
                {gameOver.winner === Team.RED ? "RED" : "BLUE"} TEAM WINS!
              </h1>
              {isAssassin && (
                <p className="text-lg text-gray-600 mt-2">
                  {stats.assassinHitBy === Team.RED ? "Red" : "Blue"} team hit the assassin!
                </p>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="bg-parchment rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">GAME STATS</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-wood-dark">{stats.turnsPlayed}</div>
              <div className="text-xs text-gray-500">Turns Played</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-team-red">{stats.redRemaining}</div>
              <div className="text-xs text-gray-500">Red Cards Left</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-team-blue">{stats.blueRemaining}</div>
              <div className="text-xs text-gray-500">Blue Cards Left</div>
            </div>
          </div>
        </div>

        {/* Revealed Board */}
        <div className="grid grid-cols-5 gap-2 mb-6">
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
                className={`${getColor()} rounded-lg p-2 text-center aspect-[4/3]
                           flex items-center justify-center ${card.revealed ? "opacity-60" : ""}`}
              >
                <span className="text-xs sm:text-sm font-bold font-[family-name:var(--font-display)]">
                  {card.word}
                </span>
              </div>
            );
          })}
        </div>

        {/* Game Log */}
        {gs && (
          <div className="bg-parchment rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">GAME LOG</h3>
            <div className="space-y-1 text-sm max-h-60 overflow-y-auto">
              {gs.log.map((entry, i) => (
                <div key={i} className="py-1 border-b border-parchment-dark last:border-0">
                  <span className={entry.team === Team.RED ? "text-team-red" : "text-team-blue"}>
                    [{entry.team}]
                  </span>{" "}
                  {entry.type === "CLUE" && (
                    <span>Clue: <strong>{entry.details.clue?.word}</strong> {entry.details.clue?.number}</span>
                  )}
                  {entry.type === "GUESS_CORRECT" && <span className="text-green-600">✓ {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_WRONG" && <span className="text-orange-600">✗ {entry.details.cardWord}</span>}
                  {entry.type === "GUESS_ASSASSIN" && <span className="text-red-800">☠ {entry.details.cardWord}</span>}
                  {entry.type === "PASS" && <span className="text-gray-500">Passed</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rematch */}
        {player.isHost && (
          <button
            onClick={() => getSocket().emit("client:rematch")}
            className="w-full py-4 bg-wood text-white rounded-xl font-bold text-xl
                       hover:bg-wood-dark transition-colors"
          >
            REMATCH
          </button>
        )}
      </div>
    </div>
  );
}
