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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-green-50 to-violet-100 font-body">
      {/* Navigation */}
      <nav
        className="bg-white border-b-4 border-transparent shadow-sm sticky top-0 z-50"
        style={{ borderImage: "var(--rainbow) 1" }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/profile"
            className="font-display text-2xl font-bold rainbow-text hover:opacity-80 transition-opacity"
          >
            Workout Maths
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className={`font-display font-semibold px-4 py-2 rounded-2xl transition-all text-lg ${
                pathname === "/profile"
                  ? "bg-violet-100 text-violet-700 border-2 border-violet-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Profile
            </Link>
            <Link
              href="/quiz"
              className={`font-display font-semibold px-4 py-2 rounded-2xl transition-all text-lg ${
                pathname === "/quiz"
                  ? "bg-violet-100 text-violet-700 border-2 border-violet-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Quiz
            </Link>
            <button
              onClick={handleLogout}
              className="font-display font-semibold px-4 py-2 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all text-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
