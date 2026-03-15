"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type LeaderboardEntry, type UserProfile } from "@/lib/api";

const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const TABLE_TIER: Record<number, { label: string; color: string; bg: string }> = {
  2: { label: "Easy", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  5: { label: "Easy", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  10: { label: "Easy", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  3: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  4: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  6: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  8: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  9: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  7: { label: "Hard", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  11: { label: "Hard", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  12: { label: "Hard", color: "text-red-700", bg: "bg-red-100 border-red-300" },
};

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
        <div className="text-center">
          <div className="text-6xl float-1 mb-4">⭐</div>
          <p className="font-display text-2xl text-purple-600">Loading your stuff...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const quizCount =
    leaderboard.find((e) => e.username === profile.username)?.quiz_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-body text-purple-200 text-lg mb-1">Welcome back,</p>
            <h1 className="font-display text-5xl font-bold">{profile.display_name}! 👋</h1>
            <p className="font-body text-purple-200 mt-2">{quizCount} quizzes completed</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-3xl px-8 py-6 text-center border-2 border-white/30">
            <p className="font-body text-purple-200 text-sm uppercase tracking-wide font-semibold">
              Total Points
            </p>
            <p className="font-display text-6xl font-bold text-amber-300">
              {profile.total_points.toLocaleString()}
            </p>
            <p className="font-body text-purple-200 text-sm">⭐ points earned</p>
          </div>
        </div>
      </div>

      {/* Table selector */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-amber-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl font-bold text-gray-800">
            Pick Your Tables 🎯
          </h2>
          {saving && (
            <span className="font-body text-sm text-gray-400 animate-pulse">Saving...</span>
          )}
        </div>
        <p className="font-body text-gray-500 mb-6">
          Choose which times tables to practise. Mix them up for more points! 💪
        </p>

        <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-11">
          {ALL_TABLES.map((t) => {
            const tier = TABLE_TIER[t];
            const selected = selectedTables.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTable(t)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all transform hover:scale-110 active:scale-95 font-display font-bold text-xl shadow-sm ${
                  selected
                    ? `${tier.bg} ${tier.color} border-current scale-105 shadow-md`
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400"
                }`}
              >
                <span className="text-2xl">{t}</span>
                {selected && (
                  <span className="absolute -top-2 -right-2 text-lg">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mt-5 flex-wrap">
          <span className="font-body text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">
            🟢 Easy: 1pt (×2, ×5, ×10)
          </span>
          <span className="font-body text-sm font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            🟡 Medium: 2pts (×3,4,6,8,9)
          </span>
          <span className="font-body text-sm font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full border border-red-200">
            🔴 Hard: 3pts (×7, ×11, ×12)
          </span>
        </div>
      </div>

      {/* Start quiz button */}
      <div className="text-center">
        {selectedTables.length > 0 ? (
          <Link
            href="/quiz"
            className="font-display inline-block bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-3xl px-12 py-5 rounded-3xl transition-all transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Start Quiz! 🚀
          </Link>
        ) : (
          <div className="font-display text-2xl text-gray-400 bg-gray-100 rounded-3xl py-5 px-12 inline-block">
            Select at least one table to start ☝️
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-purple-200">
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-6">
            🏆 Leaderboard
          </h2>
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.username === profile.username;
              return (
                <div
                  key={entry.username}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                    isMe
                      ? "bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 shadow-md"
                      : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                  }`}
                >
                  <span
                    className={`font-display text-2xl font-bold w-10 text-center ${
                      entry.rank === 1
                        ? "text-amber-500"
                        : entry.rank === 2
                        ? "text-gray-400"
                        : entry.rank === 3
                        ? "text-orange-400"
                        : "text-gray-400"
                    }`}
                  >
                    {entry.rank === 1
                      ? "🥇"
                      : entry.rank === 2
                      ? "🥈"
                      : entry.rank === 3
                      ? "🥉"
                      : `#${entry.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-display text-lg font-semibold truncate ${
                        isMe ? "text-amber-700" : "text-gray-800"
                      }`}
                    >
                      {entry.display_name}
                      {isMe && (
                        <span className="font-body text-sm text-amber-600 ml-2">(you!)</span>
                      )}
                    </p>
                    <p className="font-body text-sm text-gray-500">
                      {entry.quiz_count} quiz{entry.quiz_count !== 1 ? "zes" : ""}
                    </p>
                  </div>
                  <span
                    className={`font-display text-2xl font-bold ${
                      isMe ? "text-amber-600" : "text-purple-600"
                    }`}
                  >
                    {entry.total_points.toLocaleString()} ⭐
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
