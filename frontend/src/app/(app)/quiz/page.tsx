"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type QuizSessionResponse, type UserProfile } from "@/lib/api";
import { formatTime, generateQuestions, getStreakBadge, type Question } from "@/lib/quiz";
import { playCorrect, playWrong } from "@/lib/sounds";

interface AnswerRecord {
  table_number: number;
  multiplier: number;
  selected_answer: number;
  answered_at: string;
  is_correct: boolean;
  correct_answer: number;
}

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
  const startTimeRef = useRef<number>(0);
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
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);
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
          if (timerRef.current) clearInterval(timerRef.current);
          setIsSubmitting(true);
          try {
            const result = await api.post<QuizSessionResponse>("/quiz/sessions", {
              started_at: startedAtRef.current,
              duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
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
    [selectedOption, isSubmitting, questions, currentIndex, currentStreak, answers, router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-display text-2xl text-slate-400">Getting your quiz ready...</p>
      </div>
    );
  }

  if (hasNoTables) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-3xl p-12 shadow-sm border border-slate-100 max-w-md">
          <h2 className="font-display text-3xl font-bold text-slate-800 mb-4">No tables selected</h2>
          <p className="font-body text-slate-500 mb-6 text-lg">
            Pick at least one times table on your profile first.
          </p>
          <Link
            href="/profile"
            className="font-display inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold text-xl px-8 py-4 rounded-2xl transition-all transform hover:scale-[1.02]"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-display text-3xl text-slate-400">Calculating your score...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const streakBadge = getStreakBadge(currentStreak);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        {/* Timer */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 w-28 text-center">
          <p className="font-body text-xs text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Time</p>
          <p className="font-display text-2xl font-bold text-slate-700">
            {formatTime(elapsedSeconds)}
          </p>
        </div>

        {/* Progress */}
        <div className="text-center">
          <p className="font-body text-slate-400 text-sm font-semibold uppercase tracking-wide">
            {currentIndex + 1} <span className="text-slate-300">/ 10</span>
          </p>
          <div className="flex gap-1.5 mt-2 justify-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full transition-all ${
                  i < answers.length
                    ? answers[i].is_correct
                      ? "bg-emerald-400"
                      : "bg-red-400"
                    : i === currentIndex
                    ? "bg-violet-400 scale-125 ring-2 ring-violet-200 ring-offset-1"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 w-28 text-center">
          <p className="font-body text-xs text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Streak</p>
          <p className="font-display text-2xl font-bold text-amber-500">
            {currentStreak === 0 ? "–" : `${currentStreak} 🔥`}
          </p>
        </div>
      </div>

      {/* Streak badge */}
      {streakBadge && (
        <div className="text-center mb-4 slide-up">
          <span className="font-display inline-block bg-amber-500 text-white px-6 py-2 rounded-full text-lg font-bold shadow-sm streak-pulse">
            {streakBadge.emoji} {currentStreak} in a row! {streakBadge.label}!
          </span>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-6 text-center">
        <p className="font-body text-slate-400 text-base mb-3">What is...</p>
        <p className="font-display font-bold text-slate-900 leading-none tracking-tight"
           style={{ fontSize: "clamp(4rem, 12vw, 6rem)" }}>
          {currentQuestion.table} × {currentQuestion.multiplier}
        </p>
        <p className="font-display text-4xl text-slate-400 mt-2">= ?</p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {currentQuestion.options.map((option, i) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option === currentQuestion.correctAnswer;

          let btnClass =
            "font-display text-5xl font-bold py-7 min-h-[5rem] rounded-3xl border-2 transition-all transform active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400 focus-visible:ring-offset-2 ";

          if (selectedOption === null) {
            btnClass +=
              "bg-white border-slate-200 text-slate-800 hover:border-violet-300 hover:bg-violet-50 hover:scale-105 cursor-pointer";
          } else if (isCorrectOption) {
            btnClass += `bg-emerald-100 border-emerald-500 text-emerald-700 scale-105 btn-correct ${
              optionResult === "correct" && isSelected ? "btn-correct-pulse" : ""
            }`;
          } else if (isSelected && !isCorrectOption) {
            btnClass += "bg-red-100 border-red-400 text-red-600 btn-wrong";
          } else {
            btnClass += "bg-slate-50 border-slate-100 text-slate-300";
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
          <p className="font-body text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Previous answers
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {[...answers].reverse().map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-body bg-slate-50"
              >
                <span className="font-semibold text-slate-700">
                  {a.table_number} × {a.multiplier}
                </span>
                <span className="text-slate-500">
                  <span className={a.is_correct ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {a.selected_answer}
                  </span>
                  {!a.is_correct && (
                    <span className="text-emerald-600 font-bold ml-2">✓ {a.correct_answer}</span>
                  )}
                </span>
                <span className={`w-4 h-4 rounded-full flex-shrink-0 ${a.is_correct ? "bg-emerald-400" : "bg-red-400"}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
