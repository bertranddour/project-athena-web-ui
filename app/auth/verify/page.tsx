"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStackApp } from "@stackframe/stack";

const OTP_LENGTH = 6;
const OTP_PATTERN = /^[A-Za-z0-9]*$/;

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stackApp = useStackApp();
  const email = searchParams.get("email") ?? "";
  const nonce = searchParams.get("nonce") ?? "";
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const lastSubmittedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!email || !nonce) {
      router.replace("/auth/sign-in");
    }
  }, [email, nonce, router]);

  const code = useMemo(() => digits.join(""), [digits]);

  const handleChange = (index: number, raw: string) => {
    if (!OTP_PATTERN.test(raw)) return;
    const value = raw.toUpperCase();
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(""));
      inputsRef.current[OTP_LENGTH - 1]?.focus();
      event.preventDefault();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const submitCode = useCallback(async () => {
    if (loading) return;
    if (code.length !== OTP_LENGTH || nonce.length === 0) {
      setError("Enter the six-digit code");
      return;
    }
    lastSubmittedCode.current = code;
    setError(null);
    setLoading(true);
    try {
      const payload = `${code}${nonce}`;
      const result = await stackApp.signInWithMagicLink(payload, { noRedirect: true });
      if (result.status === "error") {
        setError(result.error.message ?? "Invalid code");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err) {
      setError((err as Error).message ?? "Unable to verify code");
      setLoading(false);
    }
  }, [code, nonce, loading, stackApp, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitCode();
  };

  useEffect(() => {
    if (code.length !== OTP_LENGTH) {
      lastSubmittedCode.current = null;
      return;
    }
    if (nonce && code !== lastSubmittedCode.current) {
      void submitCode();
    }
  }, [code, nonce, submitCode]);

  return (
    <div className="space-y-6 text-center">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Wave Artisans</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-800">Check your inbox</h1>
        <p className="text-sm text-zinc-600">Enter the six-digit code we sent to <span className="font-semibold">{email}</span>.</p>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4">
        <div className="otp-grid">
          {digits.map((digit, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="otp-input"
              value={digit}
              maxLength={1}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="neo-btn mt-8 w-full rounded-full bg-zinc-200 px-10 py-3 text-xs uppercase tracking-[0.35em] text-zinc-700 disabled:opacity-60"
        >
          {loading ? "Verifying" : "Verify Code"}
        </button>
        <button
          type="button"
          className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-700"
          onClick={() => router.replace(`/auth/sign-in?email=${encodeURIComponent(email)}`)}
        >
          Resend code
        </button>
      </form>
    </div>
  );
}
