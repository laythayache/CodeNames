import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import { AvatarDisplay } from "../components/Avatar";
import type { KalakRoundResult, KalakPlayerScore, KalakAnswer, KalakVote, KalakScoreDelta } from "shared/types";
import { KalakRoundPhase } from "shared/types";
import { playSound } from "../services/sounds";

export function KalakGamePage() {
  const { state, dispatch } = useGame();
  const player = usePlayer();
  const gs = state.kalakState;

  // Vibrate phone on new question
  useEffect(() => {
    if (gs?.roundPhase === KalakRoundPhase.QUESTION && navigator.vibrate) {
      navigator.vibrate(200);
    }
  }, [gs?.roundPhase, gs?.currentRound]);

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
          {state.timerSeconds !== null && (
            <div className={`bg-parchment rounded-lg px-3 py-1.5 text-sm font-bold
              ${state.timerSeconds <= 10 ? "text-red-600 animate-pulse" : "text-wood-dark"}`}
            >
              {state.timerSeconds}s
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
            answerRejected={state.kalakAnswerRejected}
            onRejectionSeen={() => dispatch({ type: "SET_KALAK_ANSWER_REJECTED", payload: false })}
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
  scores: KalakPlayerScore[];
  myName: string;
}) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return (
    <div className="bg-parchment rounded-xl p-3 mb-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {sorted.map((s, i) => (
          <div
            key={s.displayName}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
              ${s.displayName === myName ? "bg-purple-100 text-purple-800" : "bg-white text-gray-700"}
              ${i === 0 ? "ring-2 ring-yellow-400" : ""}`}
          >
            {i === 0 && <span>&#x1F451;</span>}
            {s.displayName}
            <span className="font-bold text-purple-600">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnsweringPhase({ playersAnswered, myName, allPlayers, answerRejected, onRejectionSeen }: {
  playersAnswered: string[];
  myName: string;
  allPlayers: string[];
  answerRejected: boolean;
  onRejectionSeen: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(playersAnswered.includes(myName));

  // Answer was rejected by server (player guessed the correct answer)
  useEffect(() => {
    if (answerRejected) {
      setSubmitted(false);
      setAnswer("");
      playSound("answer-rejected");
      // Auto-clear after 4 seconds
      const timeout = setTimeout(onRejectionSeen, 4000);
      return () => clearTimeout(timeout);
    }
  }, [answerRejected, onRejectionSeen]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    getSocket().emit("client:kalak-submit-answer", { answer: answer.trim() });
    setSubmitted(true);
    playSound("answer-submitted");
  };

  // Update submitted state if server says we already answered
  useEffect(() => {
    if (playersAnswered.includes(myName) && !submitted && !answerRejected) {
      setSubmitted(true);
    }
  }, [playersAnswered, myName, submitted, answerRejected]);

  return (
    <div className="space-y-4">
      {/* Answer rejection banner */}
      {answerRejected && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-center animate-bounce">
          <p className="text-lg font-bold text-yellow-700">You found the correct answer!</p>
          <p className="text-sm text-yellow-600 mt-1">
            Now submit a fake answer to trick others
          </p>
        </div>
      )}

      {!submitted ? (
        <div className="bg-parchment rounded-xl p-4 sm:p-6">
          <p className="text-xs font-bold text-gray-500 mb-3">YOUR FAKE ANSWER</p>
          <p className="text-xs text-gray-400 mb-3">
            Write a convincing fake answer to fool other players!
          </p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type a fake answer..."
            autoFocus
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
        <p className="text-xs font-bold text-gray-500 mb-2 text-center">
          {playersAnswered.length} / {allPlayers.length} answered
        </p>
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
              {playersAnswered.includes(name) ? "\u2713" : "..."} {name}
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
  const [votedId, setVotedId] = useState<string | null>(
    playersVoted.includes(myName) ? "unknown" : null
  );

  const handleVote = (answerId: string) => {
    getSocket().emit("client:kalak-vote", { answerId });
    setVotedId(answerId);
    playSound("vote-cast");
  };

  // Sync if server says we voted
  useEffect(() => {
    if (playersVoted.includes(myName) && !votedId) {
      setVotedId("unknown");
    }
  }, [playersVoted, myName, votedId]);

  return (
    <div className="space-y-4">
      <div className="bg-parchment rounded-xl p-4 sm:p-6">
        <p className="text-xs font-bold text-gray-500 mb-3">WHICH IS THE REAL ANSWER?</p>
        {votedId && votedId !== "unknown" && (
          <p className="text-xs text-purple-500 mb-2 text-center">
            Tap another answer to change your vote
          </p>
        )}
        <div className="space-y-2">
          {answers.map((a) => (
            <button
              key={a.id}
              onClick={() => handleVote(a.id)}
              disabled={a.isOwn}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all
                ${a.isOwn
                  ? "bg-purple-50 text-purple-400 cursor-not-allowed border-2 border-purple-200"
                  : votedId === a.id
                    ? "bg-purple-100 text-purple-800 border-2 border-purple-500 shadow-md"
                    : "bg-white text-wood-dark hover:bg-purple-50 hover:shadow-md active:scale-[0.98] border-2 border-transparent hover:border-purple-300"
                }`}
            >
              {a.text}
              {a.isOwn && <span className="text-xs ml-2">(yours)</span>}
              {votedId === a.id && <span className="text-xs ml-2">\u2713 your vote</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Who has voted */}
      <div className="bg-parchment rounded-xl p-3">
        <p className="text-xs font-bold text-gray-500 mb-2 text-center">
          {playersVoted.length} / {allPlayers.length} voted
        </p>
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
              {playersVoted.includes(name) ? "\u2713" : "..."} {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevealPhase({ result, myName }: {
  result: KalakRoundResult;
  myName: string;
}) {
  const myDelta = result.scoreDeltas[myName];

  return (
    <div className="space-y-4">
      {/* Correct answer */}
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-green-600 mb-1">CORRECT ANSWER</p>
        <p className="text-xl font-bold text-green-800">{result.correctAnswer}</p>
      </div>

      {/* Personal round summary */}
      {myDelta && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-purple-500 mb-2">YOUR ROUND</p>
          <div className="flex justify-center gap-6 text-sm">
            {myDelta.correct > 0 && (
              <div className="text-green-600 font-bold">
                +{myDelta.correct} correct
              </div>
            )}
            {myDelta.fooled > 0 && (
              <div className="text-orange-600 font-bold">
                +{myDelta.fooled} fooled {myDelta.fooled === 1 ? "player" : "players"}
              </div>
            )}
            {myDelta.total === 0 && (
              <div className="text-gray-400 font-bold">No points this round</div>
            )}
          </div>
          <p className="text-lg font-bold text-purple-700 mt-1">+{myDelta.total} pts</p>
        </div>
      )}

      {/* Knew the correct answer shoutout */}
      {result.knewCorrectAnswer.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-blue-500 mb-1">ALREADY KNEW IT</p>
          <p className="text-sm text-blue-700 font-semibold">
            {result.knewCorrectAnswer.join(", ")}
          </p>
        </div>
      )}

      {/* All answers with who wrote them and who voted for them */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">ALL ANSWERS</p>
        <div className="space-y-2">
          {result.answers.map((a: KalakAnswer) => {
            const isCorrect = a.playerIds.includes("CORRECT");
            const votersForThis = result.votes.filter((v: KalakVote) => v.answerId === a.id);
            return (
              <div
                key={a.id}
                className={`px-4 py-3 rounded-xl ${
                  isCorrect ? "bg-green-100 border-2 border-green-400" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    {isCorrect ? "\u2713 " : ""}{a.text}
                  </span>
                  {!isCorrect && a.playerNames.length > 0 && (
                    <span className="text-xs text-gray-400">
                      by {a.playerNames.join(", ")}
                    </span>
                  )}
                </div>
                {votersForThis.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {votersForThis.map((v: KalakVote) => (
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

      {/* Shame section */}
      {(result.didntAnswer.length > 0 || result.didntVote.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-red-400 mb-1">HALL OF SHAME</p>
          {result.didntAnswer.length > 0 && (
            <p className="text-xs text-red-500">
              Didn't answer: <span className="font-bold">{result.didntAnswer.join(", ")}</span>
            </p>
          )}
          {result.didntVote.length > 0 && (
            <p className="text-xs text-red-500">
              Didn't vote: <span className="font-bold">{result.didntVote.join(", ")}</span>
            </p>
          )}
        </div>
      )}

      {/* Score changes */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">ROUND POINTS</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(result.scoreDeltas)
            .sort(([, a]: [string, KalakScoreDelta], [, b]: [string, KalakScoreDelta]) => b.total - a.total)
            .map(([name, delta]: [string, KalakScoreDelta]) => (
              <div
                key={name}
                className={`px-3 py-2 rounded-lg text-sm font-bold text-center
                  ${name === myName ? "bg-purple-100 text-purple-800" : "bg-white text-gray-700"}`}
              >
                <div>{name}</div>
                <div className="text-purple-600">
                  +{delta.total}
                  {(delta.correct > 0 || delta.fooled > 0) && (
                    <span className="text-[10px] text-gray-400 ml-1">
                      ({delta.correct > 0 ? "correct" : ""}{delta.correct > 0 && delta.fooled > 0 ? " + " : ""}{delta.fooled > 0 ? `fooled ${delta.fooled}` : ""})
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
