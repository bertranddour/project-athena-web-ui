"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStackApp } from "@stackframe/stack";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const stackApp = useStackApp();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      setError("Enter your work email");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await stackApp.sendMagicLinkEmail(email);
      if (result.status === "error") {
        setError(result.error.message ?? "Unable to send code");
        setLoading(false);
        return;
      }
      const nonce = result.data?.nonce;
      router.push(`/auth/verify?email=${encodeURIComponent(email)}${nonce ? `&nonce=${encodeURIComponent(nonce)}` : ""}`);
    } catch (err) {
      setError((err as Error).message ?? "Unable to send code");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Wave Artisans</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-800">Sign in to your account</h1>
        <p className="text-sm text-zinc-600">We&apos;ll email you a six-digit code to continue.</p>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-6">
        <label className="space-y-2 text-sm text-zinc-600">
          Email
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className="w-full rounded-2xl bg-zinc-200 px-4 py-3 text-base text-zinc-800"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="neo-btn mt-8 w-full rounded-full bg-zinc-200 px-10 py-3 text-xs uppercase tracking-[0.35em] text-zinc-700 disabled:opacity-60"
        >
          {loading ? "Sending" : "Send Code"}
        </button>
      </form>
    </div>
  );
}
