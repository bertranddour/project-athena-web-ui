/**
 * API client for Athena Agent FastAPI backend
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

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async createThread(request: CreateThreadRequest): Promise<Thread> {
    const response = await fetch(`${this.baseUrl}/threads`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.statusText}`);
    }

    return response.json();
  }

  async getThread(threadId: string): Promise<Thread> {
    const response = await fetch(`${this.baseUrl}/threads/${threadId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get thread: ${response.statusText}`);
    }

    return response.json();
  }

  async getThreadState(threadId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/threads/${threadId}/state`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get thread state: ${response.statusText}`);
    }

    return response.json();
  }

  async searchThreads(
    request: ThreadSearchRequest
  ): Promise<ThreadSearchResponse> {
    const response = await fetch(`${this.baseUrl}/threads/search`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to search threads: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteThread(threadId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/threads/${threadId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete thread: ${response.statusText}`);
    }
  }

  async interruptThread(threadId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/threads/${threadId}/interrupt`,
      {
        method: "POST",
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to interrupt thread: ${response.statusText}`);
    }
  }

  /**
   * Stream messages to a thread and receive SSE responses
   * Returns a ReadableStream for processing SSE events
   */
  async streamThread(
    threadId: string,
    request: SubmitRequest
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/threads/${threadId}/stream`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to stream thread: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body for stream");
    }

    return response.body;
  }
}

/**
 * Create a singleton API client instance
 */
let apiClientInstance: ApiClient | null = null;

export function getApiClient(baseUrl?: string, apiKey?: string): ApiClient {
  if (!apiClientInstance || baseUrl) {
    const url = baseUrl || process.env.NEXT_PUBLIC_API_URL || "";
    const key = apiKey || process.env.NEXT_PUBLIC_API_KEY;
    apiClientInstance = new ApiClient(url, key);
  }
  return apiClientInstance;
}
