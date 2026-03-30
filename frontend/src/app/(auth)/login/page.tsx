"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";

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
      await api.post("/auth/login", { username, password });
      router.push("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Title + Logo */}
      <div className="text-center mb-8 pop-in">
        <h1 className="font-display text-5xl font-bold tracking-wide rainbow-text drop-shadow-sm">
          Workout Maths
        </h1>
        <p className="font-body text-slate-500 text-lg mt-2">Times tables practice</p>
        <div className="mt-6 flex justify-center">
          <Image
            src="/lion-giraffe-monkey.png"
            alt="Workout Maths animals"
            width={240}
            height={240}
            priority
          />
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm pop-in">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-6">Sign in</h2>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 mb-5 text-sm font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block font-body text-sm font-semibold text-slate-600 mb-2">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="font-body w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white transition-all"
                placeholder="your username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block font-body text-sm font-semibold text-slate-600 mb-2">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-body w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white transition-all"
                placeholder="your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="font-display w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xl py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="font-body text-center text-slate-500 mt-6">
            New here?{" "}
            <Link
              href="/signup"
              className="text-violet-600 font-semibold hover:text-violet-800 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

