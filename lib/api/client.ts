/**
 * Athena Engine API Client
 *
 * Provides typed methods for interacting with the Athena Engine backend.
 * Handles authentication with API keys and Stack Auth user IDs.
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

if (!API_KEY) {
  console.warn("NEXT_PUBLIC_API_KEY is not set. API requests may fail.");
}

/**
 * Base fetch wrapper with authentication headers
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add existing headers from options
  if (options.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Add authentication headers only if userId is provided
  if (userId) {
    headers["X-API-Key"] = API_KEY;
    headers["X-User-ID"] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "unknown_error",
      message: response.statusText,
    }));

    // Log detailed error for debugging
    console.error("API request failed:", {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      errorData,
    });

    throw new Error(errorData.message || errorData.detail || "API request failed");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

/**
 * Stream-enabled fetch for SSE endpoints
 */
async function* apiStream(
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): AsyncGenerator<any, void, unknown> {
  if (!userId) {
    throw new Error("User not authenticated. Please log in.");
  }

  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    "X-User-ID": userId,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// Agent Definitions API
// ============================================================================

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  agent_type: "single_turn" | "multi_turn" | "persistent_memory" | "business_coach";
  system_prompt: string;
  model: "sonnet" | "opus" | "haiku";
  allowed_tools: string[];
  mcp_servers: any[];
  permissions: Record<string, any>;
  resource_limits: Record<string, any>;
  network_allowlist: string[];
  temperature: number;
  max_tokens: number;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  agent_type: "single_turn" | "multi_turn" | "persistent_memory" | "business_coach";
  system_prompt: string;
  model?: "sonnet" | "opus" | "haiku";
  allowed_tools?: string[];
  mcp_servers?: any[];
  permissions?: Record<string, any>;
  resource_limits?: Record<string, any>;
  network_allowlist?: string[];
  temperature?: number;
  max_tokens?: number;
}

export const createAgentsApi = (userId: string) => ({
  /**
   * List all agent definitions
   */
  async list(): Promise<{ agents: AgentDefinition[]; total: number }> {
    return apiFetch("/v1/agents", { method: "GET" }, userId);
  },

  /**
   * Get a specific agent definition
   */
  async get(agentId: string): Promise<AgentDefinition> {
    return apiFetch(`/v1/agents/${agentId}`, { method: "GET" }, userId);
  },

  /**
   * Create a new agent definition
   */
  async create(agent: CreateAgentRequest): Promise<AgentDefinition> {
    return apiFetch(
      "/v1/agents",
      {
        method: "POST",
        body: JSON.stringify(agent),
      },
      userId
    );
  },

  /**
   * Update an agent definition
   */
  async update(
    agentId: string,
    updates: Partial<CreateAgentRequest>
  ): Promise<AgentDefinition> {
    return apiFetch(
      `/v1/agents/${agentId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
      userId
    );
  },

  /**
   * Delete an agent definition
   */
  async delete(agentId: string): Promise<void> {
    return apiFetch(`/v1/agents/${agentId}`, { method: "DELETE" }, userId);
  },
});

// ============================================================================
// Sessions API
// ============================================================================

export interface Session {
  id: string;
  agent_definition_id: string;
  session_type: "ephemeral" | "long_running" | "hybrid";
  title?: string;
  status: "active" | "paused" | "completed" | "expired" | "error";
  context_data: Record<string, any>;
  client_type: "web" | "ios" | "shortcuts" | "n8n" | "mcp";
  client_metadata?: Record<string, any>;
  message_count: number;
  total_tokens_used: number;
  total_cost_usd: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  expires_at?: string;
}

export interface CreateSessionRequest {
  agent_definition_id: string;
  session_type?: "ephemeral" | "long_running" | "hybrid";
  title?: string;
  client_type?: "web" | "ios" | "shortcuts" | "n8n" | "mcp";
  client_metadata?: Record<string, any>;
  context_data?: Record<string, any>;
  idle_timeout_minutes?: number;
  retention_days?: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "tool";
  content_type: "text" | "image" | "tool_use" | "tool_result";
  content: Record<string, any>;
  tokens_used?: number;
  sequence_number: number;
  parent_message_id?: string;
  created_at: string;
}

export interface StreamEvent {
  event_type: string;
  timestamp: string;
  [key: string]: any;
}

export const createSessionsApi = (userId: string) => ({
  /**
   * List all sessions
   */
  async list(params?: {
    agent_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: Session[]; total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/v1/sessions${query ? `?${query}` : ""}`, { method: "GET" }, userId);
  },

  /**
   * Get a specific session
   */
  async get(sessionId: string): Promise<Session> {
    return apiFetch(`/v1/sessions/${sessionId}`, { method: "GET" }, userId);
  },

  /**
   * Create a new session
   */
  async create(session: CreateSessionRequest): Promise<Session> {
    return apiFetch(
      "/v1/sessions",
      {
        method: "POST",
        body: JSON.stringify(session),
      },
      userId
    );
  },

  /**
   * Update a session
   */
  async update(
    sessionId: string,
    updates: { title?: string; status?: string; context_data?: Record<string, any> }
  ): Promise<Session> {
    return apiFetch(
      `/v1/sessions/${sessionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
      userId
    );
  },

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    return apiFetch(`/v1/sessions/${sessionId}`, { method: "DELETE" }, userId);
  },

  /**
   * Send a message to a session (non-streaming)
   */
  async sendMessage(sessionId: string, content: string, images?: any[]): Promise<Message> {
    return apiFetch(
      `/v1/sessions/${sessionId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content, images: images || [] }),
      },
      userId
    );
  },

  /**
   * Stream a message response
   */
  async* streamMessage(
    sessionId: string,
    content: string,
    images?: any[]
  ): AsyncGenerator<StreamEvent, void, unknown> {
    yield* apiStream(
      `/v1/sessions/${sessionId}/stream`,
      {
        method: "POST",
        body: JSON.stringify({ content, images: images || [] }),
      },
      userId
    );
  },

  /**
   * Get session history (messages)
   */
  async getHistory(
    sessionId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ messages: Message[]; total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(
      `/v1/sessions/${sessionId}/history${query ? `?${query}` : ""}`,
      { method: "GET" },
      userId
    );
  },
});

// ============================================================================
// Health API
// ============================================================================

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
}

export const healthApi = {
  /**
   * Check API health
   */
  async check(): Promise<HealthStatus> {
    return apiFetch("/health", { method: "GET" });
  },
};

// ============================================================================
// Export all APIs
// ============================================================================

/**
 * Create authenticated API client for a user
 */
export function createAthenaApi(userId: string) {
  return {
    agents: createAgentsApi(userId),
    sessions: createSessionsApi(userId),
    health: healthApi,
  };
}

export default createAthenaApi;
