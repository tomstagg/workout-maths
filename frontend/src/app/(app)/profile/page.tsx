"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type LeaderboardEntry, type UserProfile } from "@/lib/api";

const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const TABLE_DIFFICULTY: Record<number, "Easy" | "Medium" | "Hard"> = {
  2: "Easy", 5: "Easy", 10: "Easy",
  3: "Medium", 4: "Medium", 6: "Medium", 8: "Medium", 9: "Medium",
  7: "Hard", 11: "Hard", 12: "Hard",
};

const PROGRESSION_TIERS = [
  { points: 0, label: "Plain animal" },
  { points: 50, label: "Hat" },
  { points: 150, label: "Sunglasses" },
  { points: 300, label: "Vibrant border" },
  { points: 500, label: "Sparkle ring" },
  { points: 1000, label: "Crown" },
];

function getProgression(points: number) {
  const earnedTiers = PROGRESSION_TIERS.filter((t) => t.points <= points);
  const currentTier = earnedTiers[earnedTiers.length - 1];
  const nextTier = PROGRESSION_TIERS[earnedTiers.length];
  const progressToNext = nextTier
    ? ((points - currentTier.points) / (nextTier.points - currentTier.points)) * 100
    : 100;
  return { currentTier, nextTier, progressToNext };
}

const ANIMAL_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  giraffe: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-600" },
  lion: { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-700" },
  monkey: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-600" },
};

function AvatarCircle({
  animalType,
  initial,
  size = "md",
}: {
  animalType: string | null;
  initial: string;
  size?: "sm" | "md" | "lg";
}) {
  const style = animalType
    ? (ANIMAL_STYLES[animalType] ?? { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-600" })
    : { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-500" };

  const sizeClass =
    size === "lg"
      ? "w-20 h-20 text-3xl border-4"
      : size === "sm"
      ? "w-9 h-9 text-sm border-2"
      : "w-14 h-14 text-xl border-3";

  return (
    <div
      className={`${sizeClass} rounded-full ${style.bg} border ${style.border} flex items-center justify-center font-display font-bold ${style.text} flex-shrink-0`}
    >
      {initial.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, lb] = await Promise.all([
          api.get<UserProfile>("/auth/me"),
          api.get<LeaderboardEntry[]>("/leaderboard"),
        ]);
        setProfile(p);
        setSelectedTables(p.selected_tables);
        setLeaderboard(lb);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function toggleTable(table: number) {
    const next = selectedTables.includes(table)
      ? selectedTables.filter((t) => t !== table)
      : [...selectedTables, table];
    setSelectedTables(next);
    setSaving(true);
    try {
      await api.put<number[]>("/users/me/tables", { table_numbers: next });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-display text-2xl text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!profile) return null;

  const quizCount =
    leaderboard.find((e) => e.username === profile.username)?.quiz_count ?? 0;
  const { currentTier, nextTier, progressToNext } = getProgression(profile.total_points);

  return (
    <div className="space-y-6">
      {/* Hero card: avatar + name + points + progression */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-5">
          <AvatarCircle
            animalType={profile.animal_type}
            initial={profile.display_name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold text-slate-800 leading-tight">
              {profile.display_name}
            </h1>
            <p className="font-body text-slate-500 text-sm mt-0.5">
              {quizCount} quiz{quizCount !== 1 ? "zes" : ""} completed
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-body text-xs text-slate-400 uppercase tracking-wide font-semibold">Points</p>
            <p className="font-display text-4xl font-bold text-amber-500">
              {profile.total_points.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progression bar */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-sm font-semibold text-slate-600">
              {currentTier.label}
            </span>
            {nextTier ? (
              <span className="font-body text-sm text-slate-400">
                {nextTier.points - profile.total_points} pts to{" "}
                <span className="font-semibold text-violet-600">{nextTier.label}</span>
              </span>
            ) : (
              <span className="font-body text-sm font-semibold text-amber-500">Max level!</span>
            )}
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table selector */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-2xl font-bold text-slate-800">Pick Your Tables</h2>
          {saving && (
            <span className="font-body text-sm text-slate-400 animate-pulse">Saving...</span>
          )}
        </div>
        <p className="font-body text-slate-500 text-sm mb-5">
          Choose which times tables to practise. Harder tables earn more points.
        </p>

        <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-11">
          {ALL_TABLES.map((t) => {
            const selected = selectedTables.includes(t);
            const difficulty = TABLE_DIFFICULTY[t];
            return (
              <button
                key={t}
                onClick={() => toggleTable(t)}
                aria-label={`Table ${t}`}
                aria-pressed={selected}
                className={`relative flex flex-col items-center justify-center pt-3 pb-2 px-2 rounded-2xl border-2 transition-all transform hover:scale-110 active:scale-95 font-display font-bold shadow-sm ${
                  selected
                    ? "bg-violet-50 border-violet-500 text-violet-700 scale-105 shadow-md"
                    : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-500"
                }`}
              >
                <span className={`text-xs font-body font-semibold mb-0.5 ${
                  difficulty === "Easy" ? "text-emerald-500" :
                  difficulty === "Medium" ? "text-amber-500" :
                  "text-red-400"
                }`}>
                  {difficulty === "Easy" ? "E" : difficulty === "Medium" ? "M" : "H"}
                </span>
                <span className="text-xl">{t}</span>
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4 flex-wrap text-xs font-body font-semibold">
          <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            E = Easy (×2, ×5, ×10) — 1pt
          </span>
          <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            M = Medium (×3,4,6,8,9) — 2pts
          </span>
          <span className="text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            H = Hard (×7, ×11, ×12) — 3pts
          </span>
        </div>

        <div className="h-1 rainbow-bar rounded-full mt-5" />
      </div>

      {/* Start quiz button */}
      <div className="text-center">
        {selectedTables.length > 0 ? (
          <Link
            href="/quiz"
            className="font-display inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold text-2xl px-12 py-5 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            Start Quiz
          </Link>
        ) : (
          <div className="font-display text-xl text-slate-400 bg-slate-100 rounded-2xl py-5 px-12 inline-block">
            Select at least one table to start
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-5">Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.username === profile.username;
              return (
                <div
                  key={entry.username}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                    isMe
                      ? "bg-violet-50 border-l-4 border-violet-500"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`font-display text-xl font-bold w-8 text-center flex-shrink-0 ${
                      entry.rank <= 3 ? "text-amber-500" : "text-slate-400"
                    }`}
                  >
                    {entry.rank <= 3 ? `${entry.rank}` : `${entry.rank}`}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
                      entry.rank === 1 ? "bg-amber-100 text-amber-700 border-2 border-amber-300" :
                      entry.rank === 2 ? "bg-slate-100 text-slate-600 border-2 border-slate-300" :
                      entry.rank === 3 ? "bg-orange-100 text-orange-600 border-2 border-orange-300" :
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {entry.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-display text-lg font-semibold truncate ${
                        isMe ? "text-violet-700" : "text-slate-800"
                      }`}
                    >
                      {entry.display_name}
                      {isMe && (
                        <span className="font-body text-sm text-violet-500 ml-2 font-normal">(you)</span>
                      )}
                    </p>
                    <p className="font-body text-xs text-slate-400">
                      {entry.quiz_count} quiz{entry.quiz_count !== 1 ? "zes" : ""}
                    </p>
                  </div>
                  <span
                    className={`font-display text-xl font-bold flex-shrink-0 ${
                      isMe ? "text-amber-500" : "text-slate-600"
                    }`}
                  >
                    {entry.total_points.toLocaleString()} <span className="text-amber-400 text-lg">★</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
