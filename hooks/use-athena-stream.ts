/**
 * React hook for streaming with Athena Engine API
 *
 * Handles SSE streaming, session management, and message state
 * with Stack Auth authentication.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@stackframe/stack";
import {
  createAthenaApi,
  type Message as AthenaMessage,
} from "@/lib/api/client";
import { type Message, type UIMessage } from "@/lib/api-client";

export interface StreamState {
  messages: Message[];
  ui?: UIMessage[];
  context?: Record<string, unknown>;
}

export interface UseAthenaStreamOptions {
  agentId: string;
  sessionId: string | null;
  onSessionId?: (sessionId: string) => void;
  fetchStateHistory?: boolean;
}

export interface UseAthenaStreamReturn {
  state: StreamState;
  loading: boolean;
  isConnected: boolean;
  submit: (input: {
    messages?: Message[];
    context?: Record<string, unknown>;
  }) => Promise<void>;
  interrupt: () => Promise<void>;
}

/**
 * Map Athena Message to legacy Message format for UI compatibility
 */
function mapAthenaMessageToLegacy(athenaMsg: AthenaMessage): Message {
  const content = athenaMsg.content;

  // Handle different content formats
  if (typeof content === "string") {
    return {
      id: athenaMsg.id,
      type: athenaMsg.role === "user" ? "human" : athenaMsg.role === "assistant" ? "ai" : "tool",
      content: content,
    };
  }

  // Content is already structured (object with text/image/etc)
  return {
    id: athenaMsg.id,
    type: athenaMsg.role === "user" ? "human" : athenaMsg.role === "assistant" ? "ai" : "tool",
    content: content as any,
  };
}

/**
 * Map legacy Message to Athena API message format
 */
function mapLegacyMessageContent(message: Message): { content: string; images?: any[] } {
  if (typeof message.content === "string") {
    return { content: message.content };
  }

  // Handle content blocks
  const blocks = Array.isArray(message.content) ? message.content : [message.content];
  const textParts: string[] = [];
  const images: any[] = [];

  for (const block of blocks) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
    } else if (block.type === "image" && block.data) {
      images.push({
        type: "base64",
        media_type: block.mimeType || "image/jpeg",
        data: block.data,
      });
    }
  }

  return {
    content: textParts.join("\n"),
    images: images.length > 0 ? images : undefined,
  };
}

export function useAthenaStream(options: UseAthenaStreamOptions): UseAthenaStreamReturn {
  const { agentId, sessionId, onSessionId, fetchStateHistory } = options;
  const user = useUser();

  const [state, setState] = useState<StreamState>({
    messages: [],
    ui: [],
    context: {},
  });
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId);

  // Update session ID ref when it changes
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Fetch initial state if we have a session ID
  useEffect(() => {
    if (!sessionId || !fetchStateHistory || !user?.id) return;

    const fetchHistory = async () => {
      try {
        const api = createAthenaApi(user.id);
        const { messages } = await api.sessions.getHistory(sessionId);

        setState({
          messages: messages.map(mapAthenaMessageToLegacy),
          ui: [],
          context: {},
        });
      } catch (error) {
        console.error("Failed to fetch session history:", error);
        setIsConnected(false);
      }
    };

    fetchHistory();
  }, [sessionId, user?.id, fetchStateHistory]);

  const submit = useCallback(
    async (input: { messages?: Message[]; context?: Record<string, unknown> }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        setLoading(true);
        setIsConnected(true);

        console.log("Submitting message with user ID:", user.id);
        const api = createAthenaApi(user.id);
        let activeSessionId = currentSessionIdRef.current;

        // Create session if we don't have one
        if (!activeSessionId) {
          // If agentId is not a UUID, try to find the agent by name or list agents
          let agentDefinitionId = agentId;

          // Check if agentId looks like a UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);

          if (!isUUID) {
            // Try to find agent by listing all agents and matching by name
            try {
              const { agents } = await api.agents.list();
              const agent = agents.find(a => a.name === agentId || a.id === agentId);

              if (!agent) {
                throw new Error(
                  `Agent "${agentId}" not found. Available agents: ${agents.map(a => a.name).join(", ")}`
                );
              }

              agentDefinitionId = agent.id;
              console.log(`Using agent "${agent.name}" (${agent.id})`);
            } catch (error) {
              console.error("Failed to list agents:", error);
              throw new Error(
                `Failed to find agent "${agentId}". Please ensure the agent exists in the Athena Engine.`
              );
            }
          }

          const sessionRequest: any = {
            agent_definition_id: agentDefinitionId,
            session_type: "long_running",
            client_type: "web",
          };

          // Only add context_data if it exists and has keys
          if (input.context && Object.keys(input.context).length > 0) {
            sessionRequest.context_data = input.context;
          }

          console.log("Creating session with request:", sessionRequest);
          const session = await api.sessions.create(sessionRequest);
          activeSessionId = session.id;
          currentSessionIdRef.current = activeSessionId;
          if (onSessionId) {
            onSessionId(activeSessionId);
          }
        }

        // Add user message optimistically
        if (input.messages && input.messages.length > 0) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...input.messages!],
            context: input.context || prev.context,
          }));
        }

        // Get the last user message to send
        const lastMessage = input.messages?.[input.messages.length - 1];
        if (!lastMessage) {
          throw new Error("No message to send");
        }

        const { content, images } = mapLegacyMessageContent(lastMessage);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Stream the response
        const streamGenerator = api.sessions.streamMessage(
          activeSessionId,
          content,
          images
        );

        // Buffer for accumulating AI message chunks
        let aiMessageBuffer: string[] = [];
        let currentAiMessageId: string | null = null;
        let toolCalls: any[] = [];

        for await (const event of streamGenerator) {
          // Check if we've been aborted
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          switch (event.event_type) {
            case "stream_start":
              // Initialize new AI message
              currentAiMessageId = event.message_id || `ai-${Date.now()}`;
              aiMessageBuffer = [];
              toolCalls = [];
              break;

            case "content_delta":
              // Accumulate text chunks
              if (event.delta) {
                aiMessageBuffer.push(event.delta);

                // Update state with accumulated text
                setState((prev) => {
                  const existingMessageIndex = prev.messages.findIndex(
                    (m) => m.id === currentAiMessageId
                  );

                  const updatedMessage: Message = {
                    id: currentAiMessageId!,
                    type: "ai",
                    content: aiMessageBuffer.join(""),
                    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                  };

                  if (existingMessageIndex >= 0) {
                    const newMessages = [...prev.messages];
                    newMessages[existingMessageIndex] = updatedMessage;
                    return { ...prev, messages: newMessages };
                  } else {
                    return {
                      ...prev,
                      messages: [...prev.messages, updatedMessage],
                    };
                  }
                });
              }
              break;

            case "tool_use_start":
              // Add tool call to list
              toolCalls.push({
                id: event.tool_use_id,
                name: event.tool_name,
                args: event.tool_input || {},
              });

              // Update message with tool calls
              setState((prev) => {
                const existingMessageIndex = prev.messages.findIndex(
                  (m) => m.id === currentAiMessageId
                );

                if (existingMessageIndex >= 0) {
                  const newMessages = [...prev.messages];
                  newMessages[existingMessageIndex] = {
                    ...newMessages[existingMessageIndex],
                    tool_calls: toolCalls,
                  };
                  return { ...prev, messages: newMessages };
                }
                return prev;
              });
              break;

            case "tool_use_result":
              // Add tool result as a tool message
              if (event.tool_use_id) {
                const toolMessage: Message = {
                  id: `tool-${event.tool_use_id}`,
                  type: "tool",
                  content: JSON.stringify(event.tool_output),
                  tool_call_id: event.tool_use_id,
                  name: event.tool_name || "tool",
                };

                setState((prev) => ({
                  ...prev,
                  messages: [...prev.messages, toolMessage],
                }));
              }
              break;

            case "message_complete":
              // Finalize the AI message
              console.log("Message complete:", event);
              break;

            case "usage_metrics":
              // Log token usage
              console.log("Usage metrics:", {
                input_tokens: event.input_tokens,
                output_tokens: event.output_tokens,
                cost_usd: event.cost_usd,
              });
              break;

            case "stream_end":
              // Stream complete
              console.log("Stream ended successfully");
              break;

            case "stream_error":
              // Handle error
              console.error("Stream error:", event.error_message);
              setIsConnected(false);
              break;
          }
        }

        // Reset buffers
        aiMessageBuffer = [];
        currentAiMessageId = null;
        toolCalls = [];
      } catch (error) {
        console.error("Stream error:", error);
        setIsConnected(false);
        throw error;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [user?.id, agentId, onSessionId]
  );

  const interrupt = useCallback(async () => {
    // Abort the current stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Note: Athena API doesn't have an interrupt endpoint yet
    // The abort controller will stop processing the stream
    console.log("Stream interrupted");
  }, []);

  return {
    state,
    loading,
    isConnected,
    submit,
    interrupt,
  };
}
