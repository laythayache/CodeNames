import { useState } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { KalakRoundPhase } from "shared/types";

export function KalakGamePage() {
  const { state } = useGame();
  const player = usePlayer();
  const gs = state.kalakState;

  if (!gs) return null;

  const isArabic = gs.language === "ARABIC";

  return (
    <div className="min-h-dvh bg-felt p-3 sm:p-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-parchment rounded-lg px-3 py-1.5 text-sm font-bold text-wood-dark">
            Round {gs.currentRound} / {gs.totalRounds}
          </div>
          {gs.timerSeconds !== null && (
            <div className={`bg-parchment rounded-lg px-3 py-1.5 text-sm font-bold
              ${gs.timerSeconds <= 10 ? "text-red-600 animate-pulse" : "text-wood-dark"}`}
            >
              {gs.timerSeconds}s
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <Scoreboard scores={gs.scores} myName={player.displayName} />

        {/* Question */}
        {gs.question && (
          <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 text-center">
            <p className="text-xs font-bold text-gray-500 mb-2">QUESTION</p>
            <p className="text-lg sm:text-xl font-bold text-wood-dark">{gs.question}</p>
          </div>
        )}

        {/* Phase Content */}
        {gs.roundPhase === KalakRoundPhase.QUESTION && (
          <div className="text-center text-parchment-dark text-sm animate-pulse">
            Get ready...
          </div>
        )}

        {gs.roundPhase === KalakRoundPhase.ANSWERING && (
          <AnsweringPhase
            playersAnswered={gs.playersAnswered}
            myName={player.displayName}
            allPlayers={gs.players.filter((p) => p.isConnected).map((p) => p.displayName)}
          />
        )}

        {gs.roundPhase === KalakRoundPhase.VOTING && gs.answers && (
          <VotingPhase
            answers={gs.answers}
            playersVoted={gs.playersVoted}
            myName={player.displayName}
            allPlayers={gs.players.filter((p) => p.isConnected).map((p) => p.displayName)}
          />
        )}

        {gs.roundPhase === KalakRoundPhase.REVEAL && state.kalakRoundResult && (
          <RevealPhase
            result={state.kalakRoundResult}
            myName={player.displayName}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-Components ──

function Scoreboard({ scores, myName }: {
  scores: { displayName: string; score: number }[];
  myName: string;
}) {
  return (
    <div className="bg-parchment rounded-xl p-3 mb-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {scores.map((s, i) => (
          <div
            key={s.displayName}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
              ${s.displayName === myName ? "bg-purple-100 text-purple-800" : "bg-white text-gray-700"}
              ${i === 0 ? "ring-2 ring-yellow-400" : ""}`}
          >
            {i === 0 && "👑 "}
            {s.displayName}
            <span className="font-bold text-purple-600">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnsweringPhase({ playersAnswered, myName, allPlayers }: {
  playersAnswered: string[];
  myName: string;
  allPlayers: string[];
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(playersAnswered.includes(myName));

  const handleSubmit = () => {
    if (!answer.trim()) return;
    getSocket().emit("client:kalak-submit-answer", { answer: answer.trim() });
    setSubmitted(true);
  };

  // Update submitted state if server says we already answered
  if (playersAnswered.includes(myName) && !submitted) {
    setSubmitted(true);
  }

  return (
    <div className="space-y-4">
      {!submitted ? (
        <div className="bg-parchment rounded-xl p-4 sm:p-6">
          <p className="text-xs font-bold text-gray-500 mb-3">YOUR ANSWER</p>
          <p className="text-xs text-gray-400 mb-3">
            Type the real answer — or a convincing fake to fool others!
          </p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                       focus:border-purple-500 focus:outline-none text-lg mb-3"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-lg
                       shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      ) : (
        <div className="bg-parchment rounded-xl p-6 text-center">
          <p className="text-lg font-bold text-purple-600 mb-2">Answer Submitted!</p>
          <p className="text-sm text-gray-500">Waiting for others...</p>
        </div>
      )}

      {/* Who has answered */}
      <div className="bg-parchment rounded-xl p-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {allPlayers.map((name) => (
            <span
              key={name}
              className={`px-3 py-1 rounded-full text-xs font-semibold
                ${playersAnswered.includes(name)
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
                }`}
            >
              {playersAnswered.includes(name) ? "✓" : "..."} {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function VotingPhase({ answers, playersVoted, myName, allPlayers }: {
  answers: { id: string; text: string; isOwn: boolean }[];
  playersVoted: string[];
  myName: string;
  allPlayers: string[];
}) {
  const [voted, setVoted] = useState(playersVoted.includes(myName));

  const handleVote = (answerId: string) => {
    if (voted) return;
    getSocket().emit("client:kalak-vote", { answerId });
    setVoted(true);
  };

  if (playersVoted.includes(myName) && !voted) {
    setVoted(true);
  }

  return (
    <div className="space-y-4">
      <div className="bg-parchment rounded-xl p-4 sm:p-6">
        <p className="text-xs font-bold text-gray-500 mb-3">WHICH IS THE REAL ANSWER?</p>
        <div className="space-y-2">
          {answers.map((a) => (
            <button
              key={a.id}
              onClick={() => handleVote(a.id)}
              disabled={voted || a.isOwn}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all
                ${a.isOwn
                  ? "bg-purple-50 text-purple-400 cursor-not-allowed border-2 border-purple-200"
                  : voted
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-white text-wood-dark hover:bg-purple-50 hover:shadow-md active:scale-[0.98] border-2 border-transparent hover:border-purple-300"
                }`}
            >
              {a.text}
              {a.isOwn && <span className="text-xs ml-2">(yours)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Who has voted */}
      <div className="bg-parchment rounded-xl p-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {allPlayers.map((name) => (
            <span
              key={name}
              className={`px-3 py-1 rounded-full text-xs font-semibold
                ${playersVoted.includes(name)
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
                }`}
            >
              {playersVoted.includes(name) ? "✓" : "..."} {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevealPhase({ result, myName }: {
  result: {
    correctAnswer: string;
    answers: { id: string; text: string; playerId: string; playerName: string }[];
    votes: { voterName: string; answerId: string }[];
    scoreDeltas: Record<string, { correct: number; fooled: number; total: number }>;
  };
  myName: string;
}) {
  return (
    <div className="space-y-4">
      {/* Correct answer */}
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-green-600 mb-1">CORRECT ANSWER</p>
        <p className="text-xl font-bold text-green-800">{result.correctAnswer}</p>
      </div>

      {/* All answers with who wrote them and who voted for them */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">ALL ANSWERS</p>
        <div className="space-y-2">
          {result.answers.map((a) => {
            const isCorrect = a.playerId === "CORRECT";
            const votersForThis = result.votes.filter((v) => v.answerId === a.id);
            return (
              <div
                key={a.id}
                className={`px-4 py-3 rounded-xl ${
                  isCorrect ? "bg-green-100 border-2 border-green-400" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    {isCorrect ? "✓ " : ""}{a.text}
                  </span>
                  {!isCorrect && (
                    <span className="text-xs text-gray-400">by {a.playerName}</span>
                  )}
                </div>
                {votersForThis.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {votersForThis.map((v) => (
                      <span key={v.voterName} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                        ${isCorrect ? "bg-green-200 text-green-800" : "bg-red-100 text-red-600"}`}>
                        {v.voterName} {isCorrect ? "+2" : "fooled!"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Score changes */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">ROUND POINTS</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(result.scoreDeltas)
            .filter(([, d]) => d.total > 0)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([name, delta]) => (
              <div
                key={name}
                className={`px-3 py-2 rounded-lg text-sm font-bold text-center
                  ${name === myName ? "bg-purple-100 text-purple-800" : "bg-white text-gray-700"}`}
              >
                <div>{name}</div>
                <div className="text-purple-600">
                  +{delta.total}
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({delta.correct > 0 ? "correct" : ""}{delta.correct > 0 && delta.fooled > 0 ? " + " : ""}{delta.fooled > 0 ? `fooled ${delta.fooled}` : ""})
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
