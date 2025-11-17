"use client";

import { type Thread } from "@/lib/api-client";
import { type Session } from "@/lib/api/client";
import { useQueryState } from "nuqs";
import { useUser } from "@stackframe/stack";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  Dispatch,
  SetStateAction,
} from "react";

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

/**
 * Map Athena Session to legacy Thread format for UI compatibility
 */
function mapSessionToThread(session: Session): Thread {
  return {
    thread_id: session.id,
    assistant_id: session.agent_definition_id,
    values: {
      messages: [],
      ui: [],
      context: session.context_data || {},
    },
    metadata: {
      title: session.title,
      status: session.status,
      message_count: session.message_count,
      total_tokens: session.total_tokens_used,
      total_cost: session.total_cost_usd,
    },
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const [agentId] = useQueryState("agentId");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    // Skip if user not authenticated
    if (!user?.id) {
      console.warn("User not authenticated, skipping thread fetch");
      return [];
    }

    try {
      const { createAthenaApi } = await import("@/lib/api/client");
      const api = createAthenaApi(user.id);

      const { sessions } = await api.sessions.list({
        agent_id: agentId || undefined,
        status: "active",
        limit: 100,
      });

      return sessions.map(mapSessionToThread);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      return [];
    }
  }, [user?.id, agentId]);

  const value = {
    getThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
