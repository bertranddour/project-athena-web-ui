"use client";

import ThreadHistory from "@/components/thread/history";
import { ArrowLeft } from "lucide-react";
import { ThreadProvider } from "@/providers/Thread";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageContent />
    </Suspense>
  );
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryString = searchParams.toString();
  const backHref = queryString ? `/?${queryString}` : "/";
  const iconBubbleClass =
    "neo-btn inline-flex size-12 items-center justify-center rounded-full border border-zinc-300/60 bg-white/80 text-zinc-600 shadow-wave-button transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200";

  return (
    <ThreadProvider>
      <div className="min-h-dvh bg-zinc-200 px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                Thread history
              </p>
              <p className="text-sm text-zinc-600">
                Review and reopen recent Athena sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              aria-label="Back to console"
              className={iconBubbleClass}
            >
              <ArrowLeft className="h-5 w-5 text-amber-400" />
            </button>
          </div>
          <ThreadHistory />
        </div>
      </div>
    </ThreadProvider>
  );
}
