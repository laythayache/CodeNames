import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { AvatarDisplay } from "../components/Avatar";
import { KalakRoundPhase, GamePhase } from "shared/types";
import type { KalakHostDisplayPayload, KalakRoundResult } from "shared/types";
import { playSound } from "../services/sounds";

// ── Reveal sub-steps for dramatic effect ──

type RevealStep = "OPTIONS" | "CORRECT" | "VOTES" | "SHAME";

const REVEAL_STEP_DURATION: Record<RevealStep, number> = {
  OPTIONS: 2000,
  CORRECT: 2000,
  VOTES: 2000,
  SHAME: 2000,
};

export function KalakHostGamePage() {
  const { state } = useGame();
  const display = state.kalakHostDisplay;
  const roundResult = state.kalakRoundResult;
  const scores = display?.scores ?? state.kalakHostDisplay?.scores ?? [];

  if (!display) return null;

  const isArabic = display.language === "ARABIC";

  return (
    <div
      className="min-h-dvh bg-gray-950 text-white overflow-hidden relative"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Ambient purple gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-purple-950/40 via-gray-950 to-gray-950 pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border border-gray-800">
          <span className="text-gray-400 text-sm font-bold">ROUND</span>
          <span className="text-white text-2xl font-bold ml-2">
            {display.currentRound}
          </span>
          <span className="text-gray-500 text-lg">
            /{display.totalRounds}
          </span>
        </div>

        {display.timerSeconds !== null && (
          <div className={`bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border
            ${display.timerSeconds <= 10
              ? "border-red-500/50 animate-pulse"
              : "border-gray-800"
            }`}
          >
            <span className={`text-2xl font-mono font-bold
              ${display.timerSeconds <= 10 ? "text-red-400" : "text-white"}`}>
              {display.timerSeconds}s
            </span>
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border border-gray-800">
          <span className="text-gray-400 text-sm font-bold">ROOM</span>
          <span className="text-purple-400 text-lg font-mono font-bold ml-2">
            {display.roomCode}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6"
           style={{ minHeight: "calc(100dvh - 80px)" }}>
        {display.roundPhase === KalakRoundPhase.QUESTION && (
          <QuestionPhase question={display.question} />
        )}

        {display.roundPhase === KalakRoundPhase.ANSWERING && (
          <AnsweringPhase
            question={display.question}
            playersAnswered={display.playersAnswered}
            totalPlayers={display.answerCount}
          />
        )}

        {display.roundPhase === KalakRoundPhase.VOTING && display.answers && (
          <VotingPhase
            question={display.question}
            answers={display.answers}
            playersVoted={display.playersVoted}
            totalPlayers={display.answerCount}
          />
        )}

        {display.roundPhase === KalakRoundPhase.REVEAL && roundResult && (
          <RevealPhase result={roundResult} display={display} />
        )}
      </div>

      {/* Scoreboard: Show during REVEAL phase and every 5 rounds */}
      {display.roundPhase === KalakRoundPhase.REVEAL && scores.length > 0 && (
        display.currentRound % 5 === 0 || display.phase === GamePhase.GAME_OVER
      ) && (
        <div className="relative z-10 px-6 pb-6">
          <HostScoreboard scores={scores} />
        </div>
      )}
    </div>
  );
}

// ── Question Phase: Dramatic entrance ──

function QuestionPhase({ question }: { question: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`text-center max-w-4xl transition-all duration-700 ease-out
      ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}>
      <div className="text-purple-400 text-lg font-bold uppercase tracking-widest mb-6 animate-pulse">
        Get Ready
      </div>
      {question && (
        <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
          {question}
        </h2>
      )}
    </div>
  );
}

// ── Answering Phase: Question + progress ──

function AnsweringPhase({
  question,
  playersAnswered,
  totalPlayers,
}: {
  question: string | null;
  playersAnswered: string[];
  totalPlayers: number;
}) {
  const answeredCount = playersAnswered.length;
  const progress = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  return (
    <div className="text-center max-w-4xl w-full">
      {/* Question */}
      {question && (
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 leading-tight">
          {question}
        </h2>
      )}

      {/* Progress section */}
      <div className="bg-gray-900/60 backdrop-blur rounded-2xl p-6 border border-gray-800 max-w-xl mx-auto">
        <div className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-3">
          Writing Answers
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-linear-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-3xl font-bold">
          <span className="text-purple-400">{answeredCount}</span>
          <span className="text-gray-600"> / {totalPlayers}</span>
          <span className="text-gray-500 text-lg ml-2">answered</span>
        </div>

        {/* Animated dots */}
        {answeredCount < totalPlayers && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Voting Phase: Question + answers displayed large ──

function VotingPhase({
  question,
  answers,
  playersVoted,
  totalPlayers,
}: {
  question: string | null;
  answers: { id: string; text: string; playerIds: string[]; playerNames: string[] }[];
  playersVoted: string[];
  totalPlayers: number;
}) {
  const votedCount = playersVoted.length;
  const progress = totalPlayers > 0 ? (votedCount / totalPlayers) * 100 : 0;

  return (
    <div className="text-center max-w-5xl w-full">
      {/* Question */}
      {question && (
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 leading-tight">
          {question}
        </h2>
      )}

      {/* Answer options displayed large */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-3xl mx-auto">
        {answers.map((a, i) => (
          <div
            key={a.id}
            className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-xl px-6 py-4
                       transition-all duration-300 hover:border-purple-500/30"
          >
            <span className="text-purple-500 text-sm font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
            <span className="text-xl sm:text-2xl font-semibold">{a.text}</span>
          </div>
        ))}
      </div>

      {/* Vote counter */}
      <div className="bg-gray-900/60 backdrop-blur rounded-2xl p-5 border border-gray-800 max-w-md mx-auto">
        <div className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">
          Voting
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-linear-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-2xl font-bold">
          <span className="text-purple-400">{votedCount}</span>
          <span className="text-gray-600"> / {totalPlayers}</span>
          <span className="text-gray-500 text-base ml-2">voted</span>
        </div>
      </div>
    </div>
  );
}

// ── Reveal Phase: Multi-step dramatic reveal ──

function RevealPhase({
  result,
  display,
}: {
  result: KalakRoundResult;
  display: KalakHostDisplayPayload;
}) {
  const [step, setStep] = useState<RevealStep>("OPTIONS");

  // Advance through reveal steps automatically
  useEffect(() => {
    const steps: RevealStep[] = ["OPTIONS", "CORRECT", "VOTES", "SHAME"];
    let currentIdx = 0;

    const advance = () => {
      currentIdx++;
      if (currentIdx < steps.length) {
        setStep(steps[currentIdx]);
        // Play sound on specific reveal steps
        if (steps[currentIdx] === "CORRECT") playSound("reveal");
        if (steps[currentIdx] === "SHAME") playSound("timer-warning");
      }
    };

    // Schedule transitions
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;
    for (let i = 0; i < steps.length - 1; i++) {
      accumulated += REVEAL_STEP_DURATION[steps[i]];
      timeouts.push(setTimeout(advance, accumulated));
    }

    return () => timeouts.forEach(clearTimeout);
  }, [result.roundNumber]);

  return (
    <div className="text-center max-w-5xl w-full">
      {/* Question */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-gray-300">
        {result.question}
      </h2>

      {/* All options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-3xl mx-auto">
        {result.answers.map((a, i) => {
          const isCorrect = a.playerIds.includes("CORRECT");
          const votersForThis = result.votes.filter((v) => v.answerId === a.id);
          const showCorrectHighlight = (step === "CORRECT" || step === "VOTES" || step === "SHAME") && isCorrect;
          const showVotes = (step === "VOTES" || step === "SHAME") && votersForThis.length > 0;
          const showAuthors = (step === "VOTES" || step === "SHAME") && !isCorrect;

          return (
            <div
              key={a.id}
              className={`relative rounded-xl px-6 py-4 transition-all duration-500
                ${showCorrectHighlight
                  ? "bg-green-900/40 border-2 border-green-400 shadow-lg shadow-green-500/20 scale-105"
                  : "bg-gray-900/80 border border-gray-700"
                }`}
            >
              {/* Letter label */}
              <span className={`text-sm font-bold mr-2
                ${showCorrectHighlight ? "text-green-400" : "text-purple-500"}`}>
                {String.fromCharCode(65 + i)}.
              </span>

              {/* Answer text */}
              <span className={`text-xl sm:text-2xl font-semibold
                ${showCorrectHighlight ? "text-green-300" : "text-white"}`}>
                {a.text}
              </span>

              {/* Correct badge */}
              {showCorrectHighlight && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                  CORRECT
                </div>
              )}

              {/* Author (for player answers) */}
              {showAuthors && a.playerNames.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  Written by: {a.playerNames.join(", ")}
                </div>
              )}

              {/* Voters */}
              {showVotes && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {votersForThis.map((v) => {
                    const voterPlayer = display.players.find(
                      (p) => p.displayName === v.voterName
                    );
                    return (
                      <div
                        key={v.voterId}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                          ${isCorrect
                            ? "bg-green-800/50 text-green-300"
                            : "bg-red-900/50 text-red-300"
                          }`}
                      >
                        {voterPlayer?.avatar && (
                          <AvatarDisplay avatar={voterPlayer.avatar} size={18} />
                        )}
                        {v.voterName}
                        {isCorrect ? " +2" : " fooled!"}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shame Section */}
      {step === "SHAME" && (result.didntAnswer.length > 0 || result.didntVote.length > 0) && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-5 max-w-2xl mx-auto mb-6
                        animate-[fadeIn_0.5s_ease-out]">
          <div className="text-red-400 text-sm font-bold uppercase tracking-wider mb-3">
            Hall of Shame
          </div>
          {result.didntAnswer.length > 0 && (
            <p className="text-red-300 text-lg mb-2">
              <span className="text-red-500 font-bold">{result.didntAnswer.join(" and ")}</span>
              {" "}didn&apos;t answer!
            </p>
          )}
          {result.didntVote.length > 0 && (
            <p className="text-red-300 text-lg">
              <span className="text-red-500 font-bold">{result.didntVote.join(" and ")}</span>
              {" "}didn&apos;t vote!
            </p>
          )}
        </div>
      )}

      {/* Fooled others */}
      {step === "SHAME" && (
        <div className="max-w-2xl mx-auto">
          {Object.entries(result.scoreDeltas)
            .filter(([, d]) => d.fooled > 0)
            .sort(([, a], [, b]) => b.fooled - a.fooled)
            .map(([name, delta]) => {
              const p = display.players.find((pl) => pl.displayName === name);
              return (
                <div key={name} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/40
                  border border-purple-700/50 rounded-full m-1 text-purple-300 font-semibold text-sm">
                  {p?.avatar && <AvatarDisplay avatar={p.avatar} size={24} />}
                  {name} fooled {delta.fooled} player{delta.fooled > 1 ? "s" : ""}! +{delta.fooled}
                </div>
              );
            })}
        </div>
      )}

      {/* Score changes (mini) */}
      {step === "SHAME" && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {Object.entries(result.scoreDeltas)
            .filter(([, d]) => d.total > 0)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([name, delta]) => (
              <div key={name} className="bg-gray-900/80 border border-gray-700 rounded-lg px-4 py-2 text-center">
                <div className="text-sm text-gray-400">{name}</div>
                <div className="text-lg font-bold text-purple-400">+{delta.total}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Scoreboard ──

function HostScoreboard({ scores }: { scores: { displayName: string; score: number }[] }) {
  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-5 max-w-3xl mx-auto">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
        Leaderboard
      </h3>
      <div className="space-y-2">
        {scores.map((s, i) => {
          const barWidth = scores[0].score > 0 ? (s.score / scores[0].score) * 100 : 0;
          return (
            <div key={s.displayName} className="flex items-center gap-3">
              <span className={`w-8 text-center text-lg font-bold
                ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                {i + 1}
              </span>
              <span className="w-28 text-sm font-semibold text-white truncate">{s.displayName}</span>
              <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out
                    ${i === 0 ? "bg-linear-to-r from-yellow-600 to-yellow-400"
                      : i === 1 ? "bg-linear-to-r from-gray-500 to-gray-400"
                      : i === 2 ? "bg-linear-to-r from-orange-600 to-orange-400"
                      : "bg-linear-to-r from-purple-700 to-purple-500"
                    }`}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
              <span className="w-12 text-right text-lg font-bold text-purple-400">{s.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
