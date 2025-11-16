import { useState, useCallback, useRef, useEffect } from "react";
import { getApiClient, type Message } from "@/lib/api-client";
import { parseSSEStream, transformSSEToMessages } from "@/lib/sse-stream";

export interface UIMessage {
  type: string;
  content: any;
}

export interface StreamState {
  messages: Message[];
  ui?: UIMessage[];
  context?: Record<string, unknown>;
}

export interface UseStreamOptions {
  apiUrl: string;
  apiKey?: string;
  assistantId: string;
  threadId: string | null;
  onThreadId?: (threadId: string) => void;
  fetchStateHistory?: boolean;
}

export interface UseStreamReturn {
  state: StreamState;
  loading: boolean;
  isConnected: boolean;
  submit: (input: {
    messages?: Message[];
    context?: Record<string, unknown>;
  }) => Promise<void>;
  interrupt: () => Promise<void>;
}

export function useStream(options: UseStreamOptions): UseStreamReturn {
  const { apiUrl, apiKey, assistantId, threadId, onThreadId, fetchStateHistory } =
    options;

  const [state, setState] = useState<StreamState>({
    messages: [],
    ui: [],
    context: {},
  });
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentThreadIdRef = useRef<string | null>(threadId);

  // Update thread ID ref when it changes
  useEffect(() => {
    currentThreadIdRef.current = threadId;
  }, [threadId]);

  // Fetch initial state if we have a thread ID
  useEffect(() => {
    if (threadId && fetchStateHistory) {
      const fetchState = async () => {
        try {
          const client = getApiClient(apiUrl, apiKey);
          const threadState = await client.getThreadState(threadId);

          setState({
            messages: threadState.values?.messages || [],
            ui: threadState.values?.ui || [],
            context: threadState.values?.context || {},
          });
        } catch (error) {
          console.error("Failed to fetch thread state:", error);
          setIsConnected(false);
        }
      };

      fetchState();
    }
  }, [threadId, apiUrl, apiKey, fetchStateHistory]);

  const submit = useCallback(
    async (input: { messages?: Message[]; context?: Record<string, unknown> }) => {
      try {
        setLoading(true);
        setIsConnected(true);

        const client = getApiClient(apiUrl, apiKey);
        let activeThreadId = currentThreadIdRef.current;

        // Create thread if we don't have one
        if (!activeThreadId) {
          const thread = await client.createThread({
            assistant_id: assistantId,
            metadata: {},
          });
          activeThreadId = thread.thread_id;
          currentThreadIdRef.current = activeThreadId;
          if (onThreadId) {
            onThreadId(activeThreadId);
          }
        }

        // Add messages optimistically
        if (input.messages) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...input.messages!],
            context: input.context || prev.context,
          }));
        }

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Stream the response
        const stream = await client.streamThread(activeThreadId, {
          input: {
            messages: input.messages || [],
            context: input.context,
          },
        });

        const sseStream = parseSSEStream(stream);
        const messageStream = transformSSEToMessages(sseStream);

        // Buffer for accumulating AI message chunks
        let aiMessageBuffer: string[] = [];
        let currentAiMessageId: string | null = null;

        for await (const streamMessage of messageStream) {
          // Check if we've been aborted
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          switch (streamMessage.type) {
            case "metadata":
              // Handle metadata (thread_id, etc.)
              if (streamMessage.data.thread_id) {
                const newThreadId = streamMessage.data.thread_id;
                if (newThreadId !== currentThreadIdRef.current) {
                  currentThreadIdRef.current = newThreadId;
                  if (onThreadId) {
                    onThreadId(newThreadId);
                  }
                }
              }
              break;

            case "message": {
              // Handle AI message chunks
              const message = streamMessage.data;

              if (message.type === "ai") {
                // Set ID if this is the first chunk
                if (!currentAiMessageId) {
                  currentAiMessageId = message.id || `ai-${Date.now()}`;
                }

                // Extract text from content blocks
                if (message.content) {
                  const contentArray = Array.isArray(message.content)
                    ? message.content
                    : [message.content];

                  for (const block of contentArray) {
                    if (typeof block === "string") {
                      aiMessageBuffer.push(block);
                    } else if (block.type === "text" && block.text) {
                      aiMessageBuffer.push(block.text);
                    } else if (block.text) {
                      aiMessageBuffer.push(block.text);
                    }
                  }
                }

                // Update state with accumulated text
                setState((prev) => {
                  const existingMessageIndex = prev.messages.findIndex(
                    (m) => m.id === currentAiMessageId
                  );

                  const updatedMessage: Message = {
                    id: currentAiMessageId!,
                    type: "ai",
                    content: aiMessageBuffer.join(""),
                    metadata: message.metadata || {},
                  };

                  if (existingMessageIndex >= 0) {
                    // Update existing message
                    const newMessages = [...prev.messages];
                    newMessages[existingMessageIndex] = updatedMessage;
                    return { ...prev, messages: newMessages };
                  } else {
                    // Add new message
                    return {
                      ...prev,
                      messages: [...prev.messages, updatedMessage],
                    };
                  }
                });
              }
              break;
            }

            case "tool_use":
              // Handle tool use events (optional - can be used for UI feedback)
              console.log("Tool use:", streamMessage.data);
              break;

            case "result":
              // Final result with metadata
              console.log("Stream result:", streamMessage.data);
              break;

            case "error":
              console.error("Stream error:", streamMessage.data);
              setIsConnected(false);
              break;

            case "end":
              // Stream complete
              console.log("Stream ended");
              break;
          }
        }

        // Reset AI message buffer
        aiMessageBuffer = [];
        currentAiMessageId = null;
      } catch (error) {
        console.error("Stream error:", error);
        setIsConnected(false);
        throw error;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [apiUrl, apiKey, assistantId, onThreadId]
  );

  const interrupt = useCallback(async () => {
    // Abort the current stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Call the interrupt endpoint if we have a thread ID
    if (currentThreadIdRef.current) {
      try {
        const client = getApiClient(apiUrl, apiKey);
        await client.interruptThread(currentThreadIdRef.current);
      } catch (error) {
        console.error("Failed to interrupt thread:", error);
      }
    }
  }, [apiUrl, apiKey]);

  return {
    state,
    loading,
    isConnected,
    submit,
    interrupt,
  };
}
