import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";

export function KalakGameOverPage() {
  const { state } = useGame();
  const player = usePlayer();
  const gameOver = state.kalakGameOver;
  const [showHistory, setShowHistory] = useState(false);

  if (!gameOver) return null;

  const { scores, roundHistory, winner } = gameOver;

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-parchment rounded-2xl p-6 sm:p-8 text-center mb-4 sm:mb-6 shadow-lg">
          <div className="text-4xl mb-2">🏆</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-700 font-display">
            {winner} WINS!
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {scores[0]?.score} points
          </p>
        </div>

        {/* Final Scoreboard */}
        <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs font-bold text-gray-500 mb-4">FINAL SCORES</h2>
          <div className="space-y-2">
            {scores.map((s, i) => (
              <div
                key={s.displayName}
                className={`flex items-center justify-between px-4 py-3 rounded-xl
                  ${i === 0 ? "bg-yellow-50 border-2 border-yellow-300" :
                    i === 1 ? "bg-gray-50 border border-gray-200" :
                    i === 2 ? "bg-orange-50/50 border border-orange-200" :
                    "bg-white"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
                  <div>
                    <span className={`font-bold ${s.displayName === player.displayName ? "text-purple-700" : "text-wood-dark"}`}>
                      {s.displayName}
                    </span>
                    <div className="text-[10px] text-gray-400">
                      {s.correctAnswers} correct, fooled {s.timesFooledOthers} times
                    </div>
                  </div>
                </div>
                <span className="text-xl font-bold text-purple-600">{s.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Round History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full bg-parchment rounded-xl p-3 mb-4 text-center text-sm font-bold text-gray-500 hover:bg-parchment-dark transition-all"
        >
          {showHistory ? "Hide" : "Show"} Round History ({roundHistory.length} rounds)
        </button>

        {showHistory && (
          <div className="space-y-2 mb-4 sm:mb-6">
            {roundHistory.map((round) => (
              <div key={round.roundNumber} className="bg-parchment rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500">Round {round.roundNumber}</span>
                </div>
                <p className="text-sm font-semibold text-wood-dark mb-1">{round.question}</p>
                <p className="text-xs text-green-600 font-bold">Answer: {round.correctAnswer}</p>
              </div>
            ))}
          </div>
        )}

        {/* Rematch */}
        {player.isHost && (
          <button
            onClick={() => getSocket().emit("client:kalak-rematch")}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg sm:text-xl
                       shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition-all"
          >
            REMATCH
          </button>
        )}
      </div>
    </div>
  );
}
