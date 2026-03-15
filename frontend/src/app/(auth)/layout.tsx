import type { ReactNode } from "react";
import { Fredoka, Nunito } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100`}
    >
      <style>{`
        .font-display { font-family: var(--font-fredoka, "Fredoka", cursive); }
        .font-body { font-family: var(--font-nunito, "Nunito", sans-serif); }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        .float-1 { animation: float 3s ease-in-out infinite; }
        .float-2 { animation: float 3s ease-in-out 0.8s infinite; }
        .float-3 { animation: float 3s ease-in-out 1.6s infinite; }
        .float-4 { animation: float 3s ease-in-out 2.2s infinite; }
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-in { animation: pop-in 0.4s ease-out forwards; }
      `}</style>
      {children}
    </div>
  );
}
