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
      <span aria-hidden="true" className="absolute top-8 left-8 text-5xl float-1 select-none pointer-events-none">⭐</span>
      <span aria-hidden="true" className="absolute top-16 right-12 text-4xl float-2 select-none pointer-events-none">🌟</span>
      <span aria-hidden="true" className="absolute bottom-16 left-16 text-4xl float-3 select-none pointer-events-none">✨</span>
      <span aria-hidden="true" className="absolute bottom-8 right-8 text-5xl float-4 select-none pointer-events-none">⭐</span>

      <div className="w-full max-w-md relative z-10 pop-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div aria-hidden="true" className="text-7xl mb-3 float-1">🌟</div>
          <h1 className="font-display text-5xl font-bold drop-shadow-sm tracking-wide rainbow-text">
            Workout Maths
          </h1>
          <p className="font-body text-purple-600 text-xl font-bold mt-2">
            Times tables practice! <span aria-hidden="true">🎉</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-sky-300">
          <h2 className="font-display text-3xl font-bold text-center text-violet-700 mb-6">
            Sign In 🔑
          </h2>

          {error && (
            <div role="alert" className="bg-red-100 border-2 border-red-400 text-red-700 rounded-2xl p-3 mb-5 text-center font-bold font-body">
              <span aria-hidden="true">😬</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block font-display text-lg font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="font-body w-full border-2 border-blue-300 rounded-2xl px-4 py-3 text-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-blue-50 transition-all"
                placeholder="your username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block font-display text-lg font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-body w-full border-2 border-pink-300 rounded-2xl px-4 py-3 text-lg text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-pink-50 transition-all"
                placeholder="your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="font-display w-full bg-gradient-to-r from-sky-400 to-violet-500 hover:from-sky-500 hover:to-violet-600 text-white font-bold text-2xl py-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

        <div aria-hidden="true" className="flex justify-center gap-6 mt-8 text-3xl opacity-50 select-none">
          <span className="text-red-400">➕</span>
          <span className="text-amber-400">✖️</span>
          <span className="text-green-400">➖</span>
          <span className="text-blue-400">➗</span>
        </div>
      </div>
    </div>
  );
}
