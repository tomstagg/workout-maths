import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-violet-100">
      {children}
    </div>
  );
}
