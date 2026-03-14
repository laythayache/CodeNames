import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { playSound } from "../services/sounds";

export function GwdwGameOverPage() {
  const { state } = useGame();
  const player = usePlayer();
  const gameOver = state.gwdwGameOver;
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (gameOver) playSound("game-over");
  }, [gameOver]);

  if (!gameOver) return null;

  const { scores, roundHistory, winner, awards } = gameOver;

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-parchment rounded-2xl p-6 sm:p-8 text-center mb-4 sm:mb-6 shadow-lg">
          <div className="text-4xl mb-2">&#x1F3C6;</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-700 font-display">
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
                    <span className={`font-bold ${s.displayName === player.displayName ? "text-teal-700" : "text-wood-dark"}`}>
                      {s.displayName}
                    </span>
                    <div className="text-[10px] text-gray-400">
                      {s.correctGuesses} correct, evaded {s.timesEvaded} times
                    </div>
                  </div>
                </div>
                <span className="text-xl font-bold text-teal-600">{s.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        {awards.length > 0 && (
          <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xs font-bold text-gray-500 mb-3">SPECIAL AWARDS</h2>
            <div className="space-y-2">
              {awards.map((award, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg">
                  <span className="text-2xl">{award.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-400 uppercase">{award.title}</div>
                    <div className="text-sm font-bold text-teal-700">{award.playerName}</div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{award.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Round History */}
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
                <p className="text-sm font-semibold text-wood-dark mb-1">{round.prompt}</p>
                <p className="text-xs text-gray-500">
                  {round.answerResults.length} answers, {round.didntAnswer.length > 0 ? `${round.didntAnswer.join(", ")} skipped` : "everyone answered"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Rematch — only on host display (not player phones) */}
        {player.isHost && (
          <button
            onClick={() => getSocket().emit("client:gwdw-rematch")}
            className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg sm:text-xl
                       shadow-lg shadow-teal-600/30 hover:bg-teal-700 active:scale-95 transition-all"
          >
            REMATCH
          </button>
        )}
      </div>
    </div>
  );
}
