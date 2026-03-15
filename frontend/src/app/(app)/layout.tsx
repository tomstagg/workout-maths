"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearToken, isLoggedIn } from "@/lib/auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Nunito:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root {
          --font-fredoka: "Fredoka", cursive;
          --font-nunito: "Nunito", sans-serif;
        }
        .font-display { font-family: var(--font-fredoka); }
        .font-body { font-family: var(--font-nunito); }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        .float-1 { animation: float 3s ease-in-out infinite; }
        .float-2 { animation: float 3s ease-in-out 0.8s infinite; }
        .float-3 { animation: float 3s ease-in-out 1.6s infinite; }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .bounce-in { animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes correct-flash {
          0%, 100% { background-color: inherit; }
          30% { background-color: #4ade80; transform: scale(1.05); }
        }
        @keyframes wrong-flash {
          0%, 100% { background-color: inherit; }
          30% { background-color: #f87171; transform: scale(0.97); }
        }
        .btn-correct { animation: correct-flash 0.6s ease-out forwards; }
        .btn-wrong { animation: wrong-flash 0.6s ease-out forwards; }
        @keyframes streak-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(3deg); }
        }
        .streak-pulse { animation: streak-pulse 0.8s ease-in-out infinite; }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50 font-body">
        {/* Navigation */}
        <nav className="bg-white border-b-4 border-amber-300 shadow-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/profile"
              className="font-display text-2xl font-bold text-amber-500 hover:text-amber-600 transition-colors"
            >
              Workout Maths ⭐
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className={`font-display font-semibold px-4 py-2 rounded-xl transition-all text-lg ${
                  pathname === "/profile"
                    ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                👤 Profile
              </Link>
              <Link
                href="/quiz"
                className={`font-display font-semibold px-4 py-2 rounded-xl transition-all text-lg ${
                  pathname === "/quiz"
                    ? "bg-amber-100 text-amber-700 border-2 border-amber-300"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🧮 Quiz
              </Link>
              <button
                onClick={handleLogout}
                className="font-display font-semibold px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all text-lg border-2 border-red-200"
              >
                👋 Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </div>
    </>
  );
}
