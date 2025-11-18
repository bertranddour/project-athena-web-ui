"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useUser } from "@stackframe/stack";
import { ArrowLeft, LogOut, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const backHref = queryString ? `/?${queryString}` : "/";
  const user = useUser();
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const accountDetails = useMemo(() => {
    if (!user) {
      return {
        name: "",
        email: "",
        id: "",
      };
    }

    return {
      name: user.displayName ?? "Wave Artisan",
      email: user.primaryEmail ?? "",
      id: user.id ?? "",
    };
  }, [user]);

  const iconBubbleClass =
    "neo-btn inline-flex size-12 items-center justify-center rounded-full border border-zinc-300/60 bg-white/80 text-zinc-600 shadow-wave-button transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200";

  return (
    <div className="min-h-dvh bg-zinc-200 px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Console settings
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-800">
              Personalize your workspace
            </h1>
            <p className="text-sm text-zinc-600">
              Update account details, streaming preferences, and authentication from a single panel.
            </p>
          </div>
          <button
            type="button"
            aria-label="Back to console"
            onClick={() => router.push(backHref)}
            className={iconBubbleClass}
          >
            <ArrowLeft className="h-5 w-5 text-amber-400" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Account" description="Stack Auth profile connected to Athena Console.">
            {user === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="h-4 w-1/3 rounded-full" />
              </div>
            ) : (
              <dl className="space-y-2 text-sm text-zinc-600">
                <div>
                  <dt className="uppercase tracking-[0.3em] text-[11px] text-zinc-500">
                    Name
                  </dt>
                  <dd className="text-base text-zinc-800">{accountDetails.name}</dd>
                </div>
                {accountDetails.email && (
                  <div>
                    <dt className="uppercase tracking-[0.3em] text-[11px] text-zinc-500">
                      Email
                    </dt>
                    <dd className="text-base text-zinc-800">{accountDetails.email}</dd>
                  </div>
                )}
                {accountDetails.id && (
                  <div>
                    <dt className="uppercase tracking-[0.3em] text-[11px] text-zinc-500">
                      User ID
                    </dt>
                    <dd className="text-base text-zinc-800">{accountDetails.id}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Settings2 className="h-4 w-4" />
                Stack Auth handles secure sign-in
              </div>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-zinc-700 hover:bg-white"
                onClick={() => user?.signOut()}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Tool execution" description="Choose whether tool call outputs appear inline next to assistant responses.">
            <div className="flex items-center justify-between rounded-[1.2rem] border border-zinc-300/60 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Show tool output inside chat</p>
                <p className="text-xs text-zinc-500">Disable to hide tool call blocks and keep transcripts tidy.</p>
              </div>
              <Switch
                aria-label="Show tool output"
                checked={!hideToolCalls}
                onChange={(event) => setHideToolCalls(!event.target.checked)}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-zinc-300/60 bg-zinc-200 p-6 shadow-wave-panel">
      <div className="mb-4 space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{title}</p>
        <p className="text-sm text-zinc-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
