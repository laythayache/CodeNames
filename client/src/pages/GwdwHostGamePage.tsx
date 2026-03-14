import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { AvatarDisplay } from "../components/Avatar";
import { GwdwRoundPhase } from "shared/types";
import type { GwdwHostDisplayPayload, GwdwAnswerResult, GwdwRoundResult } from "shared/types";
import { playSound } from "../services/sounds";
import { getSocket } from "../socket";

export function GwdwHostGamePage() {
  const { state } = useGame();
  const display = state.gwdwHostDisplay;
  const answerResult = state.gwdwAnswerResult;
  const roundResult = state.gwdwRoundResult;

  if (!display) return null;

  const isArabic = display.language === "ARABIC";

  return (
    <div
      className="min-h-dvh bg-gray-950 text-white overflow-hidden relative"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Ambient teal gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-teal-950/40 via-gray-950 to-gray-950 pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border border-gray-800">
          <span className="text-gray-400 text-sm font-bold">ROUND</span>
          <span className="text-white text-2xl font-bold ml-2">{display.currentRound}</span>
          <span className="text-gray-500 text-lg">/{display.totalRounds}</span>
        </div>

        {state.timerSeconds !== null && (
          <div className={`bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border
            ${state.timerSeconds <= 10 ? "border-red-500/50 animate-pulse" : "border-gray-800"}`}
          >
            <span className={`text-2xl font-mono font-bold
              ${state.timerSeconds <= 10 ? "text-red-400" : "text-white"}`}>
              {state.timerSeconds}s
            </span>
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur rounded-xl px-5 py-2 border border-gray-800">
          <span className="text-gray-400 text-sm font-bold">ROOM</span>
          <span className="text-teal-400 text-lg font-mono font-bold ml-2">{display.roomCode}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6"
           style={{ minHeight: "calc(100dvh - 80px)" }}>

        {display.roundPhase === GwdwRoundPhase.PROMPT && (
          <PromptPhase prompt={display.prompt} />
        )}

        {display.roundPhase === GwdwRoundPhase.WRITING && (
          <WritingPhase
            prompt={display.prompt}
            playersAnswered={display.playersAnswered}
            totalPlayers={display.playerCount}
          />
        )}

        {display.roundPhase === GwdwRoundPhase.REVEAL_ANSWER && display.currentRevealAnswer && (
          <RevealAnswerPhase
            answerText={display.currentRevealAnswer.text}
            answerIndex={display.currentRevealIndex}
            totalAnswers={display.totalAnswers}
          />
        )}

        {display.roundPhase === GwdwRoundPhase.REVEAL_VOTING && display.currentRevealAnswer && (
          <VotingPhase
            answerText={display.currentRevealAnswer.text}
            answerIndex={display.currentRevealIndex}
            totalAnswers={display.totalAnswers}
            voters={display.currentVoters}
            totalVoters={display.playerCount - 1}
            voteDistribution={display.voteDistribution}
            players={display.players}
          />
        )}

        {display.roundPhase === GwdwRoundPhase.REVEAL_RESULT && answerResult && (
          <AuthorRevealPhase
            result={answerResult}
            display={display}
          />
        )}

        {display.roundPhase === GwdwRoundPhase.ROUND_SCORES && roundResult && (
          <RoundScoresPhase
            result={roundResult}
            scores={display.scores}
          />
        )}
      </div>

      {/* Admin Panel */}
      <HostAdminPanel players={display.players} />
    </div>
  );
}

// ── Prompt Phase ──

function PromptPhase({ prompt }: { prompt: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`text-center max-w-4xl transition-all duration-700 ease-out
      ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}>
      <div className="text-teal-400 text-lg font-bold uppercase tracking-widest mb-6 animate-pulse">
        New Prompt
      </div>
      {prompt && (
        <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
          {prompt}
        </h2>
      )}
    </div>
  );
}

// ── Writing Phase ──

function WritingPhase({ prompt, playersAnswered, totalPlayers }: {
  prompt: string | null;
  playersAnswered: string[];
  totalPlayers: number;
}) {
  const answeredCount = playersAnswered.length;
  const progress = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  return (
    <div className="text-center max-w-4xl w-full">
      {prompt && (
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 leading-tight">
          {prompt}
        </h2>
      )}

      <div className="bg-gray-900/60 backdrop-blur rounded-2xl p-6 border border-gray-800 max-w-xl mx-auto">
        <div className="text-teal-400 text-sm font-bold uppercase tracking-wider mb-3">
          Writing Answers
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-linear-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-3xl font-bold">
          <span className="text-teal-400">{answeredCount}</span>
          <span className="text-gray-600"> / {totalPlayers}</span>
          <span className="text-gray-500 text-lg ml-2">answered</span>
        </div>

        {answeredCount < totalPlayers && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reveal Answer Phase (dramatic answer entrance) ──

function RevealAnswerPhase({ answerText, answerIndex, totalAnswers }: {
  answerText: string;
  answerIndex: number;
  totalAnswers: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [answerIndex]);

  return (
    <div className="text-center max-w-4xl w-full">
      <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-4">
        Answer {answerIndex + 1} of {totalAnswers}
      </div>

      <div className={`transition-all duration-700 ease-out
        ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-90"}`}>
        <div className="bg-gray-900/80 backdrop-blur border-2 border-teal-500/50 rounded-2xl px-8 py-10 shadow-lg shadow-teal-500/10">
          <p className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            &ldquo;{answerText}&rdquo;
          </p>
        </div>
      </div>

      <div className="mt-6 text-teal-400 text-sm font-bold uppercase tracking-wider animate-pulse">
        Who wrote this?
      </div>
    </div>
  );
}

// ── Voting Phase ──

function VotingPhase({ answerText, answerIndex, totalAnswers, voters, totalVoters, voteDistribution, players }: {
  answerText: string;
  answerIndex: number;
  totalAnswers: number;
  voters: string[];
  totalVoters: number;
  voteDistribution: Record<string, number>;
  players: { displayName: string; avatar?: import("shared/types").Avatar | null }[];
}) {
  const votedCount = voters.length;
  const progress = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

  return (
    <div className="text-center max-w-5xl w-full">
      <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">
        Answer {answerIndex + 1} of {totalAnswers}
      </div>

      {/* Answer */}
      <div className="bg-gray-900/80 backdrop-blur border border-teal-500/30 rounded-2xl px-8 py-6 mb-8">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
          &ldquo;{answerText}&rdquo;
        </p>
      </div>

      {/* Vote progress */}
      <div className="bg-gray-900/60 backdrop-blur rounded-2xl p-5 border border-gray-800 max-w-md mx-auto">
        <div className="text-teal-400 text-sm font-bold uppercase tracking-wider mb-2">
          Voting
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-linear-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-2xl font-bold">
          <span className="text-teal-400">{votedCount}</span>
          <span className="text-gray-600"> / {totalVoters}</span>
          <span className="text-gray-500 text-base ml-2">voted</span>
        </div>
      </div>
    </div>
  );
}

// ── Author Reveal Phase (dramatic!) ──

function AuthorRevealPhase({ result, display }: {
  result: GwdwAnswerResult;
  display: GwdwHostDisplayPayload;
}) {
  const [step, setStep] = useState<"VOTES" | "AUTHOR" | "POINTS">("VOTES");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStep("AUTHOR");
      playSound("reveal");
    }, 1500);
    const t2 = setTimeout(() => setStep("POINTS"), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [result.answerId]);

  const authorPlayer = display.players.find((p) => p.displayName === result.authorName);

  return (
    <div className="text-center max-w-4xl w-full">
      {/* Answer */}
      <div className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-2xl px-8 py-5 mb-8">
        <p className="text-2xl sm:text-3xl font-bold">&ldquo;{result.answerText}&rdquo;</p>
      </div>

      {/* Vote distribution */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {result.votes.map((v) => {
          const voterPlayer = display.players.find((p) => p.displayName === v.voterName);
          const isCorrect = v.guessedAuthorName === result.authorName;
          return (
            <div
              key={v.voterName}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-500
                ${step === "AUTHOR" || step === "POINTS"
                  ? isCorrect
                    ? "bg-green-900/50 border border-green-500/50 text-green-300"
                    : "bg-red-900/30 border border-red-500/30 text-red-300"
                  : "bg-gray-800 border border-gray-700 text-gray-300"
                }`}
            >
              {voterPlayer?.avatar && <AvatarDisplay avatar={voterPlayer.avatar} size={24} />}
              <span>{v.voterName}</span>
              <span className="text-gray-500">&rarr;</span>
              <span className={step === "AUTHOR" || step === "POINTS"
                ? isCorrect ? "text-green-400" : "text-red-400"
                : "text-gray-400"
              }>
                {v.guessedAuthorName}
              </span>
              {(step === "AUTHOR" || step === "POINTS") && (
                <span className="text-xs">{isCorrect ? " +2" : ""}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Author Reveal */}
      {(step === "AUTHOR" || step === "POINTS") && (
        <div className="animate-[fadeIn_0.5s_ease-out] mb-6">
          <div className="text-teal-400 text-sm font-bold uppercase tracking-wider mb-3">
            Written By
          </div>
          <div className="flex items-center justify-center gap-4">
            {authorPlayer?.avatar && (
              <div className="animate-bounce">
                <AvatarDisplay avatar={authorPlayer.avatar} size={80} />
              </div>
            )}
            <div className="text-4xl sm:text-5xl font-bold text-teal-300">
              {result.authorName}
            </div>
          </div>

          {step === "POINTS" && (
            <div className="mt-4 text-lg">
              {result.authorPoints > 0 ? (
                <span className="text-teal-400 font-bold">
                  +{result.authorPoints} stealth point{result.authorPoints !== 1 ? "s" : ""}
                </span>
              ) : result.correctVoters.length === 0 ? (
                <span className="text-gray-500 font-bold">
                  Nobody guessed correctly - 0 stealth points
                </span>
              ) : (
                <span className="text-red-400 font-bold">
                  Everyone guessed right!
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Round Scores Phase ──

function RoundScoresPhase({ result, scores }: {
  result: GwdwRoundResult;
  scores: { displayName: string; score: number }[];
}) {
  return (
    <div className="w-full max-w-3xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-teal-300">
        Round {result.roundNumber} Scores
      </h2>
      <p className="text-gray-500 text-center text-sm mb-8">
        &ldquo;{result.prompt}&rdquo;
      </p>

      {/* Round deltas */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {Object.entries(result.scoreDeltas)
          .sort(([, a], [, b]) => b - a)
          .map(([name, delta]) => (
            <div key={name} className="bg-gray-900/80 border border-gray-700 rounded-xl px-5 py-3 text-center">
              <div className="text-sm text-gray-400">{name}</div>
              <div className="text-xl font-bold text-teal-400">+{delta}</div>
            </div>
          ))}
      </div>

      {/* Current standings */}
      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
          Standings
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
                        : "bg-linear-to-r from-teal-700 to-teal-500"
                      }`}
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-lg font-bold text-teal-400">{s.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Didn't answer */}
      {result.didntAnswer.length > 0 && (
        <div className="mt-4 bg-red-950/30 border border-red-900/50 rounded-xl p-3 text-center">
          <span className="text-red-400 text-sm font-bold">
            Didn&apos;t answer: {result.didntAnswer.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ──

function HostAdminPanel({ players }: { players: { displayName: string }[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 text-xs font-bold bg-gray-900/80 text-gray-500 rounded-lg
                   hover:bg-gray-800 active:scale-[0.99] transition-all border border-gray-800"
      >
        {expanded ? "Hide Admin" : "Admin"}
      </button>
      {expanded && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 mt-1 flex gap-2 flex-wrap items-center">
          <button
            onClick={() => {
              if (confirm("End the game?")) {
                getSocket().emit("client:admin-end-game");
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold
                       hover:bg-red-700 active:scale-95 transition-all"
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
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white"
            defaultValue=""
          >
            <option value="" disabled>Kick player...</option>
            {players.map((p) => (
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
