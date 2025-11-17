"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import {
  useAthenaStream,
  type UseAthenaStreamReturn
} from "@/hooks/use-athena-stream";
import { type Message, type UIMessage } from "@/lib/api-client";
import { useQueryState } from "nuqs";
import { useUser } from "@stackframe/stack";
import { useThreads } from "./Thread";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type StateType = { messages: Message[]; ui?: UIMessage[] };
export type { Message, UIMessage };

type StreamContextType = UseAthenaStreamReturn;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check Athena Engine API health
 * Note: Health endpoint is public and doesn't require authentication
 */
async function checkApiHealth(): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const health = await response.json();
    return health.status === "healthy";
  } catch (e) {
    console.error("Health check failed:", e);
    return false;
  }
}

const StreamSession = ({
  children,
  agentId,
}: {
  children: ReactNode;
  agentId: string;
}) => {
  const user = useUser();
  const router = useRouter();
  const [sessionId, setSessionId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();

  // Always call hooks before any early returns
  const streamValue = useAthenaStream({
    agentId,
    sessionId: sessionId ?? null,
    fetchStateHistory: true,
    onSessionId: (id) => {
      setSessionId(id);
      // Refetch threads list when session ID changes.
      // Wait for some seconds before fetching so we're able to get the new session that was created.
      sleep().then(() => getThreads().then(setThreads).catch(console.error));
    },
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (user === null) {
      // User is explicitly not signed in
      router.push("/handler/sign-in");
    }
  }, [user, router]);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth().then((ok) => {
      if (!ok) {
        toast.error("Failed to connect to Athena Engine API", {
          description: () => (
            <p>
              Please ensure the Athena Engine API server is running and accessible.
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, []);

  // Don't render children if user not loaded yet
  if (!user) {
    return null;
  }

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

// Default agent ID
const DEFAULT_AGENT_ID = "athena";

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const user = useUser();

  // Get agent ID from URL params or env variable
  const envAgentId: string | undefined = process.env.NEXT_PUBLIC_AGENT_ID;
  const [agentId] = useQueryState("agentId", {
    defaultValue: envAgentId || DEFAULT_AGENT_ID,
  });

  // Determine final agent ID to use
  const finalAgentId = agentId || envAgentId || DEFAULT_AGENT_ID;

  // Wait for user to load
  if (user === undefined) {
    return null;
  }

  return (
    <StreamSession agentId={finalAgentId}>
      {children}
    </StreamSession>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
