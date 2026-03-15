"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type TokenResponse } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<TokenResponse>("/auth/login", { username, password });
      setToken(data.access_token);
      router.push("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Floating decorations */}
      <span className="absolute top-8 left-8 text-5xl float-1 select-none pointer-events-none">⭐</span>
      <span className="absolute top-16 right-12 text-4xl float-2 select-none pointer-events-none">🌟</span>
      <span className="absolute bottom-16 left-16 text-4xl float-3 select-none pointer-events-none">✨</span>
      <span className="absolute bottom-8 right-8 text-5xl float-4 select-none pointer-events-none">⭐</span>
      <span className="absolute top-1/3 left-4 text-3xl float-2 select-none pointer-events-none opacity-40">➕</span>
      <span className="absolute top-1/2 right-4 text-3xl float-3 select-none pointer-events-none opacity-40">✖️</span>

      <div className="w-full max-w-md relative z-10 pop-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3 float-1">🌟</div>
          <h1 className="font-display text-5xl font-bold text-amber-500 drop-shadow-sm tracking-wide">
            Workout Maths
          </h1>
          <p className="font-body text-purple-600 text-xl font-bold mt-2">
            Times tables practice! 🎉
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-amber-300">
          <h2 className="font-display text-3xl font-bold text-center text-purple-700 mb-6">
            Sign In 🔑
          </h2>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 rounded-2xl p-3 mb-5 text-center font-bold font-body">
              😬 {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-display text-lg font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="font-body w-full border-2 border-blue-300 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-blue-50 transition-all"
                placeholder="your username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block font-display text-lg font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-body w-full border-2 border-pink-300 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-pink-50 transition-all"
                placeholder="your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="font-display w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-2xl py-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in... ⏳" : "Let's Go! 🚀"}
            </button>
          </form>

          <p className="font-body text-center text-gray-600 mt-6 text-lg">
            New here?{" "}
            <Link
              href="/signup"
              className="text-purple-600 font-bold hover:text-purple-800 underline decoration-2 transition-colors"
            >
              Sign up! ✨
            </Link>
          </p>
        </div>

        {/* Math symbols footer */}
        <div className="flex justify-center gap-6 mt-8 text-3xl opacity-30 select-none">
          <span>➕</span>
          <span>✖️</span>
          <span>➖</span>
          <span>➗</span>
        </div>
      </div>
    </div>
  );
}
