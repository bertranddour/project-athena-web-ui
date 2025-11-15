import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect } from "react";
import { useQueryState } from "nuqs";

import { getContentString } from "../utils";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  return (
    <div className="space-y-2">
      {threads.map((t) => {
        let itemText = t.thread_id;
        if (
          typeof t.values === "object" &&
          t.values &&
          "messages" in t.values &&
          Array.isArray(t.values.messages) &&
          t.values.messages?.length > 0
        ) {
          const firstMessage = t.values.messages[0];
          itemText = getContentString(firstMessage.content);
        }

        const isActive = t.thread_id === threadId;

        return (
          <Button
            key={t.thread_id}
            variant={isActive ? "secondary" : "ghost"}
            size="lg"
            className="w-full justify-between rounded-[1.5rem] px-6 py-4 text-left normal-case tracking-normal"
            onClick={(e) => {
              e.preventDefault();
              onThreadClick?.(t.thread_id);
              if (isActive) return;
              setThreadId(t.thread_id);
            }}
          >
            <div className="flex-1">
              <p className="truncate text-sm text-zinc-600">{itemText}</p>
              <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                {t.thread_id.slice(0, 8)}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-12 w-full rounded-[1.5rem]"
        />
      ))}
    </div>
  );
}

export default function ThreadHistory() {
  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    setThreadsLoading(true);
    getThreads()
      .then((fetchedThreads) => {
        if (cancelled) return;
        setThreads(fetchedThreads);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
      })
      .finally(() => {
        if (cancelled) return;
        setThreadsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getThreads, setThreads, setThreadsLoading]);

  return (
    <div className="space-y-4 rounded-[1.8rem] border border-zinc-300/60 bg-zinc-200 p-6 shadow-wave-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Thread History
          </p>
          <p className="text-sm text-zinc-600">Recent LangGraph runs</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setThreadsLoading(true);
            getThreads()
              .then(setThreads)
              .finally(() => setThreadsLoading(false));
          }}
        >
          Refresh
        </Button>
      </div>
      <div className="scrollbar-pretty max-h-[520px] space-y-4 overflow-y-auto pr-1">
        {threadsLoading ? (
          <ThreadHistoryLoading />
        ) : (
          <ThreadList
            threads={threads}
            onThreadClick={() => setThreadsLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
