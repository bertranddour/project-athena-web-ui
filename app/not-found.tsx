import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-zinc-200 px-6 py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-dashed border-zinc-300/80 bg-zinc-100/60 p-10 text-center shadow-wave-panel">
        <p className="text-xs uppercase tracking-[0.45em] text-zinc-400">
          Signal Lost · 404
        </p>
        <h1 className="text-3xl font-semibold text-zinc-700">
          We couldn&apos;t find that console panel.
        </h1>
        <p className="text-sm text-zinc-500">
          The page you&apos;re looking for may have drifted away or never existed.
          Head back to the dashboard to continue your session.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/history">Open History</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
