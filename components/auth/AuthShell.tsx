import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-200 px-6 py-10 text-zinc-800">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="stack-auth-card">
          {children}
        </section>
      </div>
    </div>
  );
}
