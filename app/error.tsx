"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-zinc-200 px-6 py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-zinc-300/60 bg-zinc-100/60 p-10 text-center shadow-wave-panel">
        <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">
          Something went sideways
        </p>
        <h1 className="text-3xl font-semibold text-zinc-700">
          We hit a snag processing your request.
        </h1>
        <p className="text-sm text-zinc-500">
          Our diagnostics have been pinged. You can retry the previous action or
          jump back to the dashboard while we steady the ship.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button onClick={() => reset()} className="uppercase tracking-[0.35em]">
            Retry
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
        {error?.digest && (
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-400">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
