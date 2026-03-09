import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { getSocket } from "../socket";
import { AvatarDisplay } from "../components/Avatar";
import type { KalakPlayerScore, KalakAward } from "shared/types";
import { playSound } from "../services/sounds";

// ── Reveal stages for dramatic podium animation ──

type PodiumStage = "WAITING" | "THIRD" | "SECOND" | "FIRST" | "AWARDS" | "DONE";

const STAGE_DELAY: Record<PodiumStage, number> = {
  WAITING: 500,
  THIRD: 2000,
  SECOND: 2000,
  FIRST: 3000,
  AWARDS: 4000,
  DONE: 0,
};

export function KalakHostGameOverPage() {
  const { state, dispatch } = useGame();
  const gameOver = state.kalakGameOver;
  const [stage, setStage] = useState<PodiumStage>("WAITING");
  const [showNewGame, setShowNewGame] = useState(false);

  // Advance through podium reveal stages
  useEffect(() => {
    if (!gameOver) return;

    const stages: PodiumStage[] = ["WAITING", "THIRD", "SECOND", "FIRST", "AWARDS", "DONE"];
    let currentIdx = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const advance = () => {
      currentIdx++;
      if (currentIdx < stages.length) {
        setStage(stages[currentIdx]);
        if (stages[currentIdx] === "FIRST") playSound("game-over");
        if (stages[currentIdx] === "AWARDS") playSound("leaderboard");
      }
      if (currentIdx === stages.length - 1) {
        setShowNewGame(true);
      }
    };

    let accumulated = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      accumulated += STAGE_DELAY[stages[i]];
      timeouts.push(setTimeout(advance, accumulated));
    }

    return () => timeouts.forEach(clearTimeout);
  }, [gameOver]);

  if (!gameOver) return null;

  const { scores, awards, winner } = gameOver;

  // Get top 3 for podium (or fewer if fewer players)
  const first = scores[0];
  const second = scores[1];
  const third = scores[2];

  // Find winner's player data from last known state
  const hostDisplay = state.kalakHostDisplay;
  const winnerPlayer = hostDisplay?.players.find((p) => p.displayName === winner);

  const handleNewGame = () => {
    dispatch({ type: "RESET" });
    getSocket().emit("client:kalak-rematch");
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white overflow-hidden relative">
      {/* Confetti background animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stage === "FIRST" || stage === "AWARDS" || stage === "DONE" ? (
          <ConfettiEffect />
        ) : null}
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-linear-to-b from-purple-950/30 via-gray-950 to-gray-950 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-6 py-8">

        {/* GAME OVER title */}
        <div className={`text-center mb-10 transition-all duration-700
          ${stage !== "WAITING" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold text-white tracking-tight">
            GAME OVER
          </h1>
        </div>

        {/* Podium Section */}
        <div className="flex items-end justify-center gap-4 sm:gap-6 mb-10 w-full max-w-3xl">
          {/* 2nd Place */}
          {second && (
            <PodiumSlot
              player={second}
              place={2}
              visible={stage === "SECOND" || stage === "FIRST" || stage === "AWARDS" || stage === "DONE"}
              allPlayers={hostDisplay?.players}
            />
          )}

          {/* 1st Place */}
          {first && (
            <PodiumSlot
              player={first}
              place={1}
              visible={stage === "FIRST" || stage === "AWARDS" || stage === "DONE"}
              allPlayers={hostDisplay?.players}
              isWinner
            />
          )}

          {/* 3rd Place */}
          {third && (
            <PodiumSlot
              player={third}
              place={3}
              visible={stage === "THIRD" || stage === "SECOND" || stage === "FIRST" || stage === "AWARDS" || stage === "DONE"}
              allPlayers={hostDisplay?.players}
            />
          )}
        </div>

        {/* Winner highlight */}
        {(stage === "FIRST" || stage === "AWARDS" || stage === "DONE") && first && (
          <div className="text-center mb-8 animate-[fadeIn_0.6s_ease-out]">
            <div className="text-yellow-400 text-lg sm:text-xl font-bold uppercase tracking-wider mb-2">
              Champion
            </div>
            <div className="flex items-center justify-center gap-4">
              {winnerPlayer?.avatar && (
                <div className="relative">
                  <AvatarDisplay avatar={winnerPlayer.avatar} size={100} />
                  <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
                    👑
                  </div>
                </div>
              )}
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-yellow-300">
                  {winner}
                </div>
                <div className="text-2xl text-purple-400 font-bold">
                  {first.score} points
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Awards Section */}
        {(stage === "AWARDS" || stage === "DONE") && awards.length > 0 && (
          <div className="w-full max-w-3xl mb-8 animate-[fadeIn_0.6s_ease-out]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-4">
              Special Awards
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {awards.map((award, i) => (
                <AwardCard key={i} award={award} />
              ))}
            </div>
          </div>
        )}

        {/* Full Scoreboard */}
        {(stage === "AWARDS" || stage === "DONE") && (
          <div className="w-full max-w-2xl mb-8 animate-[fadeIn_0.8s_ease-out]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-4">
              Final Standings
            </h3>
            <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-4 space-y-2">
              {scores.map((s, i) => (
                <div
                  key={s.displayName}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all
                    ${i === 0 ? "bg-yellow-900/20 border border-yellow-700/30" :
                      i === 1 ? "bg-gray-800/50 border border-gray-700/30" :
                      i === 2 ? "bg-orange-900/20 border border-orange-700/30" :
                      "bg-gray-900/50"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-bold w-8 text-center
                      ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white">{s.displayName}</span>
                      <div className="text-[10px] text-gray-500">
                        {s.correctAnswers} correct &middot; fooled {s.timesFooledOthers} &middot; got fooled {s.timesGotFooled}
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-400">{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Game Button */}
        {showNewGame && (
          <button
            onClick={handleNewGame}
            className="px-10 py-5 bg-purple-600 text-white rounded-2xl font-bold text-xl sm:text-2xl
                       shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition-all
                       animate-[fadeIn_0.5s_ease-out]"
          >
            NEW GAME
          </button>
        )}
      </div>
    </div>
  );
}

// ── Podium Slot ──

function PodiumSlot({
  player,
  place,
  visible,
  allPlayers,
  isWinner,
}: {
  player: KalakPlayerScore;
  place: 1 | 2 | 3;
  visible: boolean;
  allPlayers?: { displayName: string; avatar: import("shared/types").Avatar | null }[];
  isWinner?: boolean;
}) {
  const heights: Record<number, string> = { 1: "h-40 sm:h-48", 2: "h-28 sm:h-36", 3: "h-20 sm:h-28" };
  const colors: Record<number, string> = {
    1: "from-yellow-600 to-yellow-400",
    2: "from-gray-500 to-gray-400",
    3: "from-orange-600 to-orange-400",
  };
  const labels: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

  const matchedPlayer = allPlayers?.find((p) => p.displayName === player.displayName);

  return (
    <div className={`flex flex-col items-center transition-all duration-700 ease-out
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
    >
      {/* Avatar */}
      {matchedPlayer?.avatar && (
        <div className={`mb-2 ${isWinner ? "animate-bounce" : ""}`}>
          <AvatarDisplay avatar={matchedPlayer.avatar} size={place === 1 ? 72 : 56} />
        </div>
      )}

      {/* Name & Score */}
      <div className="text-center mb-2">
        <div className={`font-bold ${place === 1 ? "text-xl text-yellow-300" : "text-sm text-white"}`}>
          {player.displayName}
        </div>
        <div className={`font-bold ${place === 1 ? "text-2xl text-yellow-400" : "text-lg text-purple-400"}`}>
          {player.score}
        </div>
      </div>

      {/* Podium block */}
      <div className={`w-24 sm:w-32 ${heights[place]} rounded-t-xl bg-linear-to-t ${colors[place]}
                        flex items-center justify-center shadow-lg`}>
        <span className="text-3xl sm:text-4xl font-bold text-white/80">{labels[place]}</span>
      </div>
    </div>
  );
}

// ── Award Card ──

function AwardCard({ award }: { award: KalakAward }) {
  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 text-center
                    hover:border-purple-500/30 transition-all">
      <div className="text-3xl mb-2">{award.emoji}</div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
        {award.title}
      </div>
      <div className="text-lg font-bold text-purple-300">{award.playerName}</div>
      <div className="text-sm text-gray-500">{award.value}</div>
    </div>
  );
}

// ── Confetti CSS Animation ──

function ConfettiEffect() {
  // Generate confetti pieces with CSS
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 3}s`,
    color: ["#a855f7", "#facc15", "#f97316", "#22c55e", "#3b82f6", "#ec4899"][
      Math.floor(Math.random() * 6)
    ],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "2px",
            animation: `confettiFall ${p.duration} ${p.delay} linear infinite`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </>
  );
}
