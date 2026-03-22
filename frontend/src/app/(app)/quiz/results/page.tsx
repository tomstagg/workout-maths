"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { api, type QuizSessionResponse } from "@/lib/api";
import { getStreakBadge } from "@/lib/quiz";
import { playFanfarePerfect, playFanfareShort } from "@/lib/sounds";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getScoreMessage(correct: number): { message: string; emoji: string; color: string } {
  if (correct === 10)
    return {
      message: "PERFECT! You're a times tables superstar!",
      emoji: "⭐",
      color: "from-amber-400 via-orange-400 to-yellow-300",
    };
  if (correct >= 8)
    return {
      message: "Amazing work! So close to perfect!",
      emoji: "🎉",
      color: "from-purple-500 to-pink-500",
    };
  if (correct >= 5)
    return {
      message: "Great effort! Keep practising!",
      emoji: "💪",
      color: "from-blue-500 to-cyan-400",
    };
  return {
    message: "Nice try! Every attempt makes you better!",
    emoji: "🌟",
    color: "from-green-500 to-teal-400",
  };
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<QuizSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sessions = await api.get<QuizSessionResponse[]>("/quiz/sessions");
        const found = sessions.find((s) => s.id === sessionId) ?? null;
        setSession(found);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
    else setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    if (session.correct_count === 10) {
      playFanfarePerfect();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#38bdf8", "#818cf8", "#c084fc"],
      });
      setTimeout(
        () =>
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { x: 0.2, y: 0.5 },
            angle: 60,
          }),
        400
      );
      setTimeout(
        () =>
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { x: 0.8, y: 0.5 },
            angle: 120,
          }),
        800
      );
      setTimeout(
        () =>
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          }),
        1200
      );
    } else {
      playFanfareShort();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div aria-hidden="true" className="text-6xl float-1 mb-4">🌟</div>
          <p className="font-display text-2xl text-purple-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl text-gray-500">Results not found 😕</p>
        <Link href="/profile" className="font-display text-purple-600 underline mt-4 block text-xl">
          Go back to profile
        </Link>
      </div>
    );
  }

  const { message, emoji, color } = getScoreMessage(session.correct_count);
  const streakBadge = getStreakBadge(session.max_streak);
  const durationSeconds = Math.round(session.duration_seconds);
  const isPerfect = session.correct_count === 10;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Score hero */}
      <div className={`bg-gradient-to-br ${color} rounded-3xl p-8 text-white text-center shadow-2xl relative overflow-hidden`}>
        {isPerfect && (
          <>
            <span aria-hidden="true" className="absolute top-4 left-6 text-3xl sparkle-spin select-none pointer-events-none">✨</span>
            <span aria-hidden="true" className="absolute top-4 right-6 text-3xl sparkle-spin-slow select-none pointer-events-none">⭐</span>
            <span aria-hidden="true" className="absolute bottom-6 left-8 text-2xl sparkle-spin-slow select-none pointer-events-none">✨</span>
            <span aria-hidden="true" className="absolute bottom-4 right-10 text-3xl sparkle-spin select-none pointer-events-none">⭐</span>
          </>
        )}
        <p className="font-body text-white/80 text-lg mb-2 uppercase tracking-wide font-semibold">
          Your Score
        </p>
        <p
          className={`font-display font-bold leading-none ${isPerfect ? "rainbow-text" : ""}`}
          style={{ fontSize: "clamp(5rem, 20vw, 9rem)" }}
        >
          {session.correct_count}
          <span className={`${isPerfect ? "" : "text-white/60"} text-[0.4em]`}>/10</span>
        </p>
        <p className="font-display text-3xl font-bold mt-4">
          {message} {emoji}
        </p>
        <p className="font-body text-white/70 mt-2">
          ⏱ {formatTime(durationSeconds)} · {session.table_numbers.map((t) => `×${t}`).join(", ")}
        </p>
      </div>

      {/* Points breakdown */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-amber-200 p-6">
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-4">⭐ Points Earned</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="font-body text-gray-600 text-lg">Base points</span>
            <span className="font-display text-2xl font-bold text-gray-800">
              +{session.base_points}
            </span>
          </div>
          {session.streak_bonus_points > 0 && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-body text-gray-600 text-lg">🔥 Streak bonus</span>
              <span className="font-display text-2xl font-bold text-orange-500">
                +{session.streak_bonus_points}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 bg-amber-50 rounded-2xl px-4 -mx-2">
            <span className="font-display text-xl font-bold text-amber-700">Total earned</span>
            <span className="font-display text-3xl font-bold text-amber-600">
              ⭐ {session.total_points_earned}
            </span>
          </div>
        </div>

        {streakBadge && (
          <div className="mt-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-4 flex items-center gap-3 border-2 border-orange-200">
            <span className="text-4xl streak-pulse">{streakBadge.emoji}</span>
            <div>
              <p className="font-display text-lg font-bold text-orange-700">
                {streakBadge.label} achieved!
              </p>
              <p className="font-body text-orange-600 text-sm">
                {session.max_streak} consecutive correct answers 🔥
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Answers review */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-purple-200 p-6">
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-4">📋 All Answers</h2>
        <div className="space-y-2">
          {session.answers.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-body ${
                a.is_correct
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-red-50 border-2 border-red-200"
              }`}
            >
              <span className="font-display text-xl font-bold text-gray-500 w-6 text-center">
                {i + 1}
              </span>
              <span className="font-display text-lg font-semibold text-gray-800 flex-1">
                {a.table_number} × {a.multiplier} = {a.correct_answer}
              </span>
              {a.is_correct ? (
                <span className="font-body text-green-600 font-bold">
                  ✅ {a.selected_answer}
                </span>
              ) : (
                <span className="font-body text-red-500 font-bold">
                  ❌ {a.selected_answer}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-4 pb-4">
        <div className="h-1 rainbow-bar mx-auto w-32 rounded-full" />
        <div className="flex gap-4 justify-center">
          <Link
            href="/quiz"
            className="font-display bg-gradient-to-r from-sky-400 to-violet-500 hover:from-sky-500 hover:to-violet-600 text-white font-bold text-xl px-8 py-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            🔄 Play Again
          </Link>
          <Link
            href="/profile"
            className="font-display bg-violet-500 hover:bg-violet-600 text-white font-bold text-xl px-8 py-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            👤 See Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-display text-2xl text-purple-600">Loading...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
