/**
 * Legacy thread/message types shared across the UI.
 *
 * These structures map Athena Engine sessions to the existing
 * chat widgets without keeping the deprecated client around.
 */

export interface Message {
  id: string;
  type: "human" | "ai" | "tool";
  content: string | ContentBlock[];
  tool_calls?: ToolCall[];
  tool_call_id?: string | null;
  name?: string | null;
  metadata?: Record<string, any>;
}

export interface ContentBlock {
  type: "text" | "image" | "file";
  text?: string;
  mimeType?: string;
  data?: string; // base64 encoded
  metadata?: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface Thread {
  thread_id: string;
  assistant_id: string;
  values: {
    messages: Message[];
    ui?: UIMessage[];
    context?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UIMessage {
  type: string;
  content: any;
}

export interface CreateThreadRequest {
  assistant_id: string;
  metadata?: Record<string, any>;
}

export interface SubmitRequest {
  input: {
    messages: Message[];
    context?: Record<string, any>;
  };
}

export interface ThreadSearchRequest {
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface ThreadSearchResponse {
  threads: Thread[];
  total: number;
}

// No runtime client is exported from this module anymore—Athena Engine
// calls live in `lib/api/client.ts`. Keep this file focused on shared types.
