"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const ANIMALS = [
  { id: "giraffe", name: "Giraffe", initial: "G", bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-600" },
  { id: "lion", name: "Lion", initial: "L", bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-700" },
  { id: "monkey", name: "Monkey", initial: "M", bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-600" },
] as const;

type AnimalId = typeof ANIMALS[number]["id"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [animalType, setAnimalType] = useState<AnimalId | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep(2);
  }

  async function handleStep2() {
    if (!animalType) return;
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { username, password, animal_type: animalType };
      if (displayName.trim()) body.display_name = displayName.trim();
      await api.post("/auth/signup", body);
      router.push("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl font-bold tracking-wide rainbow-text drop-shadow-sm">
          Workout Maths
        </h1>
        <p className="font-body text-slate-500 text-lg mt-2">Times tables practice</p>
      </div>

      <div className="w-full max-w-md pop-in">
        {step === 1 ? (
          <>
            {/* Teacher note */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3 mb-5 text-center">
              <p className="font-body text-violet-700 text-sm">
                Your teacher must add your username before you can sign up.
              </p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-lg p-8">
              <h2 className="font-display text-2xl font-bold text-slate-800 mb-6">
                Create your account
              </h2>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 mb-5 text-sm font-body">
                  {error}
                </div>
              )}

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label htmlFor="signup-username" className="block font-body text-sm font-semibold text-slate-600 mb-2">
                    Username
                  </label>
                  <input
                    id="signup-username"
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
                  <label htmlFor="signup-display-name" className="block font-body text-sm font-semibold text-slate-600 mb-2">
                    Your Name{" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="signup-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="font-body w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white transition-all"
                    placeholder="e.g. Alex"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="block font-body text-sm font-semibold text-slate-600 mb-2">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-body w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white transition-all"
                    placeholder="choose a password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  className="font-display w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xl py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm mt-2"
                >
                  Next: Choose your animal
                </button>
              </form>

              <p className="font-body text-center text-slate-500 mt-6">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-violet-600 font-semibold hover:text-violet-800 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* Step 2: Animal picker */
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Choose your character!
            </h2>
            <p className="font-body text-slate-500 mb-8">
              Pick an animal to be your avatar. Earn cool accessories as you learn!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {ANIMALS.map((animal) => {
                const selected = animalType === animal.id;
                return (
                  <button
                    key={animal.id}
                    onClick={() => setAnimalType(animal.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all transform hover:scale-105 active:scale-95 ${
                      selected
                        ? "border-violet-500 bg-violet-50 scale-105 shadow-md"
                        : "border-slate-200 bg-white hover:border-violet-300"
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full ${animal.bg} border-2 ${animal.border} flex items-center justify-center shadow-sm`}>
                      <span className={`font-display text-3xl font-bold ${animal.text}`}>
                        {animal.initial}
                      </span>
                    </div>
                    <span className={`font-display text-lg font-semibold ${selected ? "text-violet-700" : "text-slate-700"}`}>
                      {animal.name}
                    </span>
                    {selected && (
                      <span className="font-body text-xs text-violet-500 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleStep2}
              disabled={!animalType || loading}
              className="font-display w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xl py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Let's go!"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-body w-full text-slate-500 hover:text-slate-700 text-sm mt-4 py-2 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
