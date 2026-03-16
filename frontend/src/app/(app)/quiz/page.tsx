"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type QuizSessionResponse, type UserProfile } from "@/lib/api";
import { generateQuestions, getStreakBadge, type Question } from "@/lib/quiz";
import { playCorrect, playWrong } from "@/lib/sounds";

interface AnswerRecord {
  table_number: number;
  multiplier: number;
  selected_answer: number;
  answered_at: string;
  is_correct: boolean;
  correct_answer: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const dotColors = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-emerald-400",
  "bg-teal-400",
  "bg-sky-400",
  "bg-blue-400",
  "bg-violet-400",
  "bg-pink-400",
];

export default function QuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionResult, setOptionResult] = useState<"correct" | "wrong" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasNoTables, setHasNoTables] = useState(false);
  const [loading, setLoading] = useState(true);
  const startedAtRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const profile = await api.get<UserProfile>("/auth/me");
        if (!profile.selected_tables.length) {
          setHasNoTables(true);
          setLoading(false);
          return;
        }
        const qs = generateQuestions(profile.selected_tables);
        setQuestions(qs);
        startedAtRef.current = new Date().toISOString();
        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  const handleAnswer = useCallback(
    (selected: number) => {
      if (selectedOption !== null || isSubmitting) return;

      const q = questions[currentIndex];
      const isRight = selected === q.correctAnswer;
      const now = new Date().toISOString();

      setSelectedOption(selected);
      setOptionResult(isRight ? "correct" : "wrong");

      if (isRight) playCorrect(); else playWrong();

      const newStreak = isRight ? currentStreak + 1 : 0;
      setCurrentStreak(newStreak);

      const record: AnswerRecord = {
        table_number: q.table,
        multiplier: q.multiplier,
        selected_answer: selected,
        answered_at: now,
        is_correct: isRight,
        correct_answer: q.correctAnswer,
      };

      const newAnswers = [...answers, record];

      setTimeout(async () => {
        if (currentIndex === 9) {
          // Last question — submit
          if (timerRef.current) clearInterval(timerRef.current);
          setIsSubmitting(true);
          try {
            const result = await api.post<QuizSessionResponse>("/quiz/sessions", {
              started_at: startedAtRef.current,
              duration_seconds: elapsedSeconds,
              answers: newAnswers.map((a) => ({
                table_number: a.table_number,
                multiplier: a.multiplier,
                selected_answer: a.selected_answer,
                answered_at: a.answered_at,
              })),
            });
            router.push(`/quiz/results?session=${result.id}`);
          } catch {
            setIsSubmitting(false);
          }
        } else {
          setAnswers(newAnswers);
          setCurrentIndex((i) => i + 1);
          setSelectedOption(null);
          setOptionResult(null);
        }
      }, 600);
    },
    [selectedOption, isSubmitting, questions, currentIndex, currentStreak, answers, elapsedSeconds, router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div aria-hidden="true" className="text-6xl float-1 mb-4">🧮</div>
          <p className="font-display text-2xl text-purple-600">Getting your quiz ready...</p>
        </div>
      </div>
    );
  }

  if (hasNoTables) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-3xl p-12 shadow-xl border-4 border-amber-200 max-w-md">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-4">
            No tables selected!
          </h2>
          <p className="font-body text-gray-600 mb-6 text-lg">
            You need to pick at least one times table on your profile first.
          </p>
          <Link
            href="/profile"
            className="font-display inline-block bg-gradient-to-r from-sky-400 to-violet-500 hover:from-sky-500 hover:to-violet-600 text-white font-bold text-xl px-8 py-4 rounded-full transition-all transform hover:scale-105"
          >
            Go to Profile 👤
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div aria-hidden="true" className="text-7xl float-1 mb-4">🚀</div>
          <p className="font-display text-3xl text-purple-600">Calculating your score...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const streakBadge = getStreakBadge(currentStreak);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="bg-white rounded-2xl px-5 py-3 shadow-md border-2 border-sky-200">
          <p className="font-body text-xs text-blue-600 uppercase font-semibold tracking-wide">Time</p>
          <p className="font-display text-3xl font-bold text-blue-600">
            ⏱ {formatTime(elapsedSeconds)}
          </p>
        </div>

        <div className="text-center">
          <p className="font-body text-gray-500 text-sm font-semibold uppercase tracking-wide">Question</p>
          <p className="font-display text-3xl font-bold text-gray-800">
            {currentIndex + 1}{" "}
            <span className="text-gray-400 text-2xl">/ 10</span>
          </p>
          {/* Progress dots */}
          <div className="flex gap-1 mt-2 justify-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full transition-all ${
                  i < answers.length
                    ? answers[i].is_correct
                      ? `${dotColors[i]}`
                      : "bg-rose-400"
                    : i === currentIndex
                    ? `${dotColors[i]} scale-150 ring-2 ring-offset-1`
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-3 shadow-md border-2 border-violet-200 text-right">
          <p className="font-body text-xs text-purple-600 uppercase font-semibold tracking-wide">Streak</p>
          <p className="font-display text-3xl font-bold text-purple-600">
            {currentStreak === 0 ? "–" : `${currentStreak} 🔥`}
          </p>
        </div>
      </div>

      {/* Streak badge */}
      {streakBadge && (
        <div className="text-center mb-4 slide-up">
          <span className="font-display inline-block bg-gradient-to-r from-orange-400 to-red-400 text-white px-6 py-2 rounded-full text-xl font-bold shadow-lg streak-pulse">
            {streakBadge.emoji} {currentStreak} in a row! {streakBadge.label}!
          </span>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-amber-200 p-8 mb-6 text-center">
        <p className="font-body text-gray-400 text-lg mb-2">What is...</p>
        <p className="font-display text-8xl font-bold text-gray-900 leading-none tracking-tight">
          {currentQuestion.table} × {currentQuestion.multiplier}
        </p>
        <p className="font-display text-5xl text-gray-500 mt-2">= ?</p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3">
        {currentQuestion.options.map((option, i) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option === currentQuestion.correctAnswer;

          let btnClass =
            "font-display text-5xl font-bold py-7 min-h-[5rem] rounded-3xl border-4 transition-all transform active:scale-90 shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ";

          if (selectedOption === null) {
            btnClass +=
              "bg-white border-gray-200 text-gray-800 hover:border-sky-400 hover:bg-sky-50 hover:scale-105 hover:shadow-lg cursor-pointer";
          } else if (isCorrectOption) {
            btnClass += `bg-green-400 border-green-500 text-white scale-105 shadow-lg btn-correct ${
              optionResult === "correct" && isSelected ? "btn-correct-pulse" : ""
            }`;
          } else if (isSelected && !isCorrectOption) {
            btnClass += "bg-red-400 border-red-500 text-white btn-wrong";
          } else {
            btnClass += "bg-gray-100 border-gray-200 text-gray-400";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(option)}
              disabled={selectedOption !== null}
              className={btnClass}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Answer history */}
      {answers.length > 0 && (
        <div className="bg-white rounded-3xl shadow-md border-2 border-gray-100 p-4">
          <p className="font-display text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">
            Previous answers
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...answers].reverse().map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm font-body ${
                  a.is_correct
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-rose-50 border border-rose-200"
                }`}
              >
                <span className="font-semibold text-gray-700">
                  {a.table_number} × {a.multiplier}
                </span>
                <span className="text-gray-500">
                  Your answer:{" "}
                  <span className={a.is_correct ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                    {a.selected_answer}
                  </span>
                  {!a.is_correct && (
                    <span className="text-green-600 font-bold ml-2">✓ {a.correct_answer}</span>
                  )}
                </span>
                <span>{a.is_correct ? "✅" : "❌"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
