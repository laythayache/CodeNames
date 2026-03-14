import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { usePlayer } from "../context/PlayerContext";
import { getSocket } from "../socket";
import type { GwdwPlayerScore, GwdwAnswerResult, GwdwRoundResult } from "shared/types";
import { GwdwRoundPhase } from "shared/types";
import { playSound } from "../services/sounds";

export function GwdwGamePage() {
  const { state } = useGame();
  const player = usePlayer();
  const gs = state.gwdwState;

  useEffect(() => {
    if (gs?.roundPhase === GwdwRoundPhase.PROMPT && navigator.vibrate) {
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

        {/* Prompt */}
        {gs.prompt && (
          <div className="bg-parchment rounded-xl p-4 sm:p-6 mb-4 text-center">
            <p className="text-xs font-bold text-gray-500 mb-2">PROMPT</p>
            <p className="text-lg sm:text-xl font-bold text-wood-dark">{gs.prompt}</p>
          </div>
        )}

        {/* Phase Content */}
        {gs.roundPhase === GwdwRoundPhase.PROMPT && (
          <div className="text-center text-parchment-dark text-sm animate-pulse">
            Get ready to write...
          </div>
        )}

        {gs.roundPhase === GwdwRoundPhase.WRITING && (
          <WritingPhase
            playersAnswered={gs.playersAnswered}
            myName={player.displayName}
            allPlayers={gs.players.filter((p) => p.isConnected).map((p) => p.displayName)}
          />
        )}

        {gs.roundPhase === GwdwRoundPhase.REVEAL_ANSWER && gs.currentRevealAnswer && (
          <RevealAnswerPhase
            answerText={gs.currentRevealAnswer.text}
            answerIndex={gs.currentRevealIndex}
            totalAnswers={gs.totalAnswers}
            isCurrentAuthor={gs.isCurrentAuthor}
          />
        )}

        {gs.roundPhase === GwdwRoundPhase.REVEAL_VOTING && gs.currentRevealAnswer && (
          <VotingPhase
            answerText={gs.currentRevealAnswer.text}
            answerIndex={gs.currentRevealIndex}
            totalAnswers={gs.totalAnswers}
            isCurrentAuthor={gs.isCurrentAuthor}
            voters={gs.currentVoters}
            allPlayers={gs.players.filter((p) => p.isConnected).map((p) => p.displayName)}
            myName={player.displayName}
          />
        )}

        {gs.roundPhase === GwdwRoundPhase.REVEAL_RESULT && state.gwdwAnswerResult && (
          <ResultPhase
            result={state.gwdwAnswerResult}
            myName={player.displayName}
          />
        )}

        {gs.roundPhase === GwdwRoundPhase.ROUND_SCORES && state.gwdwRoundResult && (
          <RoundScoresPhase
            result={state.gwdwRoundResult}
            myName={player.displayName}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-Components ──

function Scoreboard({ scores, myName }: {
  scores: GwdwPlayerScore[];
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
              ${s.displayName === myName ? "bg-teal-100 text-teal-800" : "bg-white text-gray-700"}
              ${i === 0 ? "ring-2 ring-yellow-400" : ""}`}
          >
            {i === 0 && <span>&#x1F451;</span>}
            {s.displayName}
            <span className="font-bold text-teal-600">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WritingPhase({ playersAnswered, myName, allPlayers }: {
  playersAnswered: string[];
  myName: string;
  allPlayers: string[];
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(playersAnswered.includes(myName));

  const handleSubmit = () => {
    if (!answer.trim()) return;
    getSocket().emit("client:gwdw-submit-answer", { answer: answer.trim() });
    setSubmitted(true);
    playSound("answer-submitted");
  };

  useEffect(() => {
    if (playersAnswered.includes(myName) && !submitted) {
      setSubmitted(true);
    }
  }, [playersAnswered, myName, submitted]);

  return (
    <div className="space-y-4">
      {!submitted ? (
        <div className="bg-parchment rounded-xl p-4 sm:p-6">
          <p className="text-xs font-bold text-gray-500 mb-3">YOUR ANSWER</p>
          <p className="text-xs text-gray-400 mb-3">
            Write your answer - be creative and true to yourself!
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            autoFocus
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl border-2 border-parchment-dark bg-white
                       focus:border-teal-500 focus:outline-none text-lg mb-3 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-lg
                       shadow-lg shadow-teal-600/30 hover:bg-teal-700 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      ) : (
        <div className="bg-parchment rounded-xl p-6 text-center">
          <p className="text-lg font-bold text-teal-600 mb-2">Answer Submitted!</p>
          <p className="text-sm text-gray-500">Waiting for others...</p>
        </div>
      )}

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

function RevealAnswerPhase({ answerText, answerIndex, totalAnswers, isCurrentAuthor }: {
  answerText: string;
  answerIndex: number;
  totalAnswers: number;
  isCurrentAuthor: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-parchment rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-gray-500 mb-1">
          ANSWER {answerIndex + 1} OF {totalAnswers}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-wood-dark mt-3">
          &ldquo;{answerText}&rdquo;
        </p>
      </div>

      {isCurrentAuthor && (
        <div className="bg-teal-50 border-2 border-teal-400 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-teal-700">This is YOUR answer!</p>
          <p className="text-sm text-teal-600 mt-1">Stay cool, don't give yourself away...</p>
        </div>
      )}

      <div className="text-center text-parchment-dark text-sm animate-pulse">
        Voting starts soon...
      </div>
    </div>
  );
}

function VotingPhase({ answerText, answerIndex, totalAnswers, isCurrentAuthor, voters, allPlayers, myName }: {
  answerText: string;
  answerIndex: number;
  totalAnswers: number;
  isCurrentAuthor: boolean;
  voters: string[];
  allPlayers: string[];
  myName: string;
}) {
  const [votedName, setVotedName] = useState<string | null>(
    voters.includes(myName) ? "unknown" : null
  );

  const handleVote = (playerName: string) => {
    getSocket().emit("client:gwdw-vote-author", { guessedAuthorName: playerName });
    setVotedName(playerName);
    playSound("vote-cast");
  };

  useEffect(() => {
    if (voters.includes(myName) && !votedName) {
      setVotedName("unknown");
    }
  }, [voters, myName, votedName]);

  // Reset vote state when answer changes
  useEffect(() => {
    setVotedName(voters.includes(myName) ? "unknown" : null);
  }, [answerIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Answer being judged */}
      <div className="bg-parchment rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-gray-500 mb-1">
          ANSWER {answerIndex + 1} OF {totalAnswers}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-wood-dark mt-3">
          &ldquo;{answerText}&rdquo;
        </p>
      </div>

      {isCurrentAuthor ? (
        <div className="bg-teal-50 border-2 border-teal-400 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-teal-700">This is YOUR answer!</p>
          <p className="text-sm text-teal-600 mt-1">Others are voting on who wrote it...</p>
        </div>
      ) : (
        <div className="bg-parchment rounded-xl p-4 sm:p-6">
          <p className="text-xs font-bold text-gray-500 mb-3">WHO WROTE THIS?</p>
          {votedName && votedName !== "unknown" && (
            <p className="text-xs text-teal-500 mb-2 text-center">
              Tap another name to change your vote
            </p>
          )}
          <div className="space-y-2">
            {allPlayers
              .filter((name) => name !== myName)
              .map((name) => (
                <button
                  key={name}
                  onClick={() => handleVote(name)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all
                    ${votedName === name
                      ? "bg-teal-100 text-teal-800 border-2 border-teal-500 shadow-md"
                      : "bg-white text-wood-dark hover:bg-teal-50 hover:shadow-md active:scale-[0.98] border-2 border-transparent hover:border-teal-300"
                    }`}
                >
                  {name}
                  {votedName === name && <span className="text-xs ml-2">{"\u2713"} your vote</span>}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Who has voted */}
      <div className="bg-parchment rounded-xl p-3">
        <p className="text-xs font-bold text-gray-500 mb-2 text-center">
          {voters.length} / {allPlayers.length - 1} voted
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {allPlayers.filter((n) => !isCurrentAuthor || n !== myName).map((name) => (
            <span
              key={name}
              className={`px-3 py-1 rounded-full text-xs font-semibold
                ${voters.includes(name)
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
                }`}
            >
              {voters.includes(name) ? "\u2713" : "..."} {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultPhase({ result, myName }: {
  result: GwdwAnswerResult;
  myName: string;
}) {
  const isAuthor = result.authorName === myName;
  const myPoints = result.voterPoints[myName] ?? 0;

  return (
    <div className="space-y-4">
      {/* Answer + Author Reveal */}
      <div className="bg-parchment rounded-xl p-4 text-center">
        <p className="text-xl sm:text-2xl font-bold text-wood-dark mb-3">
          &ldquo;{result.answerText}&rdquo;
        </p>
        <div className="bg-teal-100 border-2 border-teal-400 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs font-bold text-teal-500">WRITTEN BY</p>
          <p className="text-lg font-bold text-teal-800">{result.authorName}</p>
        </div>
      </div>

      {/* Personal result */}
      {isAuthor ? (
        <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-teal-700">
            {result.authorPoints > 0
              ? `+${result.authorPoints} stealth points!`
              : result.correctVoters.length === 0
                ? "Nobody guessed you - 0 stealth points"
                : "Everyone guessed you!"
            }
          </p>
          {result.correctVoters.length > 0 && result.authorPoints > 0 && (
            <p className="text-sm text-teal-600 mt-1">
              {result.correctVoters.length} guessed right, {result.votes.length - result.correctVoters.length} fooled
            </p>
          )}
        </div>
      ) : (
        <div className={`rounded-xl p-4 text-center border-2 ${
          myPoints > 0
            ? "bg-green-50 border-green-400"
            : "bg-red-50 border-red-300"
        }`}>
          <p className={`text-lg font-bold ${myPoints > 0 ? "text-green-700" : "text-red-600"}`}>
            {myPoints > 0 ? `+${myPoints} correct guess!` : "Wrong guess!"}
          </p>
        </div>
      )}

      {/* Vote breakdown */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">VOTES</p>
        <div className="space-y-1.5">
          {result.votes.map((v) => (
            <div key={v.voterName} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white">
              <span className="text-sm font-semibold">{v.voterName}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                ${v.guessedAuthorName === result.authorName
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
                }`}>
                guessed {v.guessedAuthorName}
                {v.guessedAuthorName === result.authorName ? " \u2713" : " \u2717"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoundScoresPhase({ result, myName }: {
  result: GwdwRoundResult;
  myName: string;
}) {
  const myDelta = result.scoreDeltas[myName] ?? 0;

  return (
    <div className="space-y-4">
      {/* Personal round summary */}
      <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-teal-500 mb-2">YOUR ROUND</p>
        <p className="text-2xl font-bold text-teal-700">+{myDelta} pts</p>
      </div>

      {/* Round score deltas */}
      <div className="bg-parchment rounded-xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">ROUND {result.roundNumber} POINTS</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(result.scoreDeltas)
            .sort(([, a], [, b]) => b - a)
            .map(([name, delta]) => (
              <div
                key={name}
                className={`px-3 py-2 rounded-lg text-sm font-bold text-center
                  ${name === myName ? "bg-teal-100 text-teal-800" : "bg-white text-gray-700"}`}
              >
                <div>{name}</div>
                <div className="text-teal-600">+{delta}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Didn't answer */}
      {result.didntAnswer.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-red-400 mb-1">DIDN'T ANSWER</p>
          <p className="text-xs text-red-500 font-bold">{result.didntAnswer.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
