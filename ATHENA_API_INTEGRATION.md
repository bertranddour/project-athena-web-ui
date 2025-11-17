# Athena Engine API Integration

## Overview

This document describes the integration of the **Athena Engine API** with the Next.js frontend using **Stack Auth** for authentication.

## ✅ Completed

### 1. API Client Implementation (`lib/api/client.ts`)

A fully typed TypeScript client for the Athena Engine API with support for:

- **Agents API**:
  - `list()` - List all agent definitions
  - `get(agentId)` - Get specific agent
  - `create(agent)` - Create new agent
  - `update(agentId, updates)` - Update agent
  - `delete(agentId)` - Delete agent

- **Sessions API**:
  - `list(params)` - List sessions with filters
  - `get(sessionId)` - Get specific session
  - `create(session)` - Create new session
  - `update(sessionId, updates)` - Update session
  - `sendMessage(sessionId, content, images)` - Send non-streaming message
  - **`streamMessage(sessionId, content, images)`** - Stream message with SSE
  - `getHistory(sessionId, params)` - Get session message history
  - `delete(sessionId)` - Delete session

- **Health API**:
  - `check()` - Check API health status

**Authentication**: All API calls include:
- `X-API-Key` - Fixed API key per client app
- `X-User-ID` - Stack Auth user ID

### 2. React Hook (`hooks/use-athena-api.ts`)

Easy-to-use React hook that:
- Automatically gets the current user from Stack Auth
- Creates an authenticated API client
- Throws error if user not logged in

```typescript
const api = useAthenaApi();
const agents = await api.agents.list();
```

### 3. Stack Auth Configuration

- **Handler**: `/app/handler/[...stack]/page.tsx` - Default Stack Auth UI pages
- **Client**: `stack/client.tsx` - Client-side Stack Auth app
- **Server**: `stack/server.tsx` - Server-side Stack Auth app
- **Layout**: Already wrapped with `StackProvider` and `StackTheme`

### 4. Environment Variables

Updated `.env.local` with:
```env
# Athena Engine API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=sk_NIv3G9ljHdclSUlmeITQJbBqc2Xz19Pioc-kC8pCpr8

# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID=30d44274-6310-4248-bb71-e16aeb79ed72
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_586anhepet66x5te41vjc6vnrx5h2p0g2a576ay0dn30r
STACK_SECRET_SERVER_KEY=ssk_69qf3av220b0wrkvjm4xfekb6634e051nhqqh0eg4f84r
```

## ✅ Refactoring Complete

### 1. Thread Provider (`providers/Thread.tsx`) ✓

**Changes:**
- Replaced old API client with Athena API using Stack Auth
- Uses `createAthenaApi(user.id)` for authenticated requests
- Maps `Session` objects to legacy `Thread` format for UI compatibility
- Added `agentId` query parameter support
- Handles authentication gracefully with proper error handling

### 2. Stream Provider (`providers/Stream.tsx`) ✓

**Changes:**
- Removed old setup form (now uses Stack Auth for authentication)
- Created new `useAthenaStream` hook for SSE streaming
- Uses Stack Auth's `useUser()` hook for authentication
- Redirects to `/handler/sign-in` if user not authenticated
- Checks API health on mount and displays toast on connection issues
- Updated to use `agentId` instead of `assistantId`

### 3. New Hook: `useAthenaStream` (`hooks/use-athena-stream.ts`) ✓

**Features:**
- Handles SSE streaming from Athena Engine API
- Maps Athena API message format to legacy format for UI compatibility
- Processes all stream events:
  - `stream_start` - Initialize new AI message
  - `content_delta` - Accumulate text chunks
  - `tool_use_start` - Track tool calls
  - `tool_use_result` - Add tool result messages
  - `message_complete` - Finalize message
  - `usage_metrics` - Log token usage
  - `stream_end` - Stream complete
  - `stream_error` - Handle errors
- Supports session creation and history fetching
- Handles optimistic UI updates

### 4. Root Layout (`app/layout.tsx`) ✓

**Changes:**
- Added `StackProvider` and `StackTheme` wrappers
- Ensures Stack Auth context is available throughout the app

### 5. Environment Configuration (`.env.local`) ✓

**Added:**
- `NEXT_PUBLIC_AGENT_ID=athena` - Default agent to use

## 🚧 Remaining To Do (Optional)

### 1. Create Agent Management UI (Optional)

New page for managing agents:

```typescript
// app/agents/page.tsx
const AgentsPage = () => {
  const api = useAthenaApi();
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    api.agents.list().then(({ agents }) => setAgents(agents));
  }, []);

  // CRUD UI for agents
};
```

### 2. Environment-Specific Configuration (Optional)

Create `.env.production` for production:

```env
NEXT_PUBLIC_API_URL=https://api.athena-engine.com
NEXT_PUBLIC_API_KEY=<production_api_key>
NEXT_PUBLIC_AGENT_ID=<default_agent_id>
```

## 📝 API Event Types

SSE events from `streamMessage()`:

| Event Type | Description | Data |
|------------|-------------|------|
| `stream_start` | Stream initialized | `session_id`, `agent_instance_id`, `message_id` |
| `content_delta` | Text chunk | `delta` (string), `message_id`, `index` |
| `tool_use_start` | Tool invocation | `tool_name`, `tool_use_id`, `tool_input` |
| `tool_use_result` | Tool result | `tool_use_id`, `tool_output`, `success` |
| `message_complete` | Message finished | `message_id`, `content`, `tokens_used` |
| `usage_metrics` | Token usage | `input_tokens`, `output_tokens`, `cost_usd` |
| `stream_end` | Stream complete | `session_id`, `total_duration_ms`, `success` |
| `stream_error` | Error occurred | `error_type`, `error_message`, `recoverable` |

## 🔐 Authentication Architecture

```
┌─────────────┐                 ┌──────────────┐
│   Browser   │                 │  Stack Auth  │
│   (Next.js) │────────────────>│   Service    │
└─────────────┘   Authenticate  └──────────────┘
       │                              │
       │         Returns user_id      │
       │<─────────────────────────────┘
       │
       │        X-API-Key: sk_xxxxx
       │        X-User-ID: <stack_auth_user_id>
       │
       v
┌─────────────────────────────────────────────────┐
│           Athena Engine API                     │
│                                                 │
│  1. Validate API key (WebUI key)               │
│  2. Look up user in neon_auth.users_sync       │
│  3. Sync to public.users if needed             │
│  4. Return response                            │
└─────────────────────────────────────────────────┘
```

## 🧪 Testing

### Test Authentication
```typescript
import { useUser } from "@stackframe/stack";
import { useAthenaApi } from "@/hooks/use-athena-api";

function TestComponent() {
  const user = useUser();
  const api = useAthenaApi();

  console.log("User:", user?.id);
  console.log("API:", api);

  // Test API call
  api.health.check().then(console.log);
}
```

### Test API Calls
```bash
# Health check
curl http://localhost:8000/health

# List sessions (with auth)
curl -H "X-API-Key: sk_NIv3G9ljHdclSUlmeITQJbBqc2Xz19Pioc-kC8pCpr8" \
     -H "X-User-ID: 84f402ea-834c-4ec1-87e1-f7730b9b9153" \
     http://localhost:8000/v1/sessions
```

## 📦 Dependencies Already Installed

- `@stackframe/stack` - Stack Auth SDK
- Other UI libraries (Radix, Tailwind, etc.)

No additional packages needed for API integration!

## 🚀 Quick Start (After Refactor)

1. **Start Backend**:
   ```bash
   cd ~/Developer/athena-engine
   docker compose up -d
   ```

2. **Start Frontend**:
   ```bash
   cd ~/Developer/project-athena-web-ui
   pnpm dev
   ```

3. **Visit**: http://localhost:3000

4. **Login**: Click "Sign In" → Stack Auth handles it

5. **Use App**: Chat with agents, manage sessions

## 📚 Resources

- **Backend API Docs**: http://localhost:8000/docs
- **Stack Auth Docs**: https://docs.stack-auth.com
- **Athena Engine README**: `~/Developer/athena-engine/README.md`
- **Authentication Docs**: `~/Developer/athena-engine/docs/AUTHENTICATION.md`

---

**Status**: API client complete ✅ | UI refactor complete ✅

**Branch**: `api-integration`

**Last Updated**: 2025-01-16

## 📝 Migration Summary

### What Changed

1. **Authentication**: Now uses Stack Auth instead of manual API key management
   - Users must sign in via `/handler/sign-in` (Stack Auth UI)
   - API client automatically includes `X-User-ID` from Stack Auth

2. **API Client**: Switched from old FastAPI client to Athena Engine API
   - Old: `lib/api-client.ts` (threads-based)
   - New: `lib/api/client.ts` (sessions-based)

3. **Streaming**: New SSE streaming implementation
   - Old: `hooks/use-stream.ts` (basic SSE)
   - New: `hooks/use-athena-stream.ts` (full event handling)

4. **Query Parameters**: Updated URL params
   - Old: `apiUrl`, `assistantId`, `threadId`
   - New: `agentId`, `threadId` (sessionId)

5. **Provider Hierarchy**: Added Stack Auth
   - `StackProvider` → `ThreadProvider` → `StreamProvider` → `ArtifactProvider` → `Thread`

### Breaking Changes

- **Authentication Required**: Users must sign in with Stack Auth before using the app
- **Environment Variables**: Added `NEXT_PUBLIC_AGENT_ID` (replaces `NEXT_PUBLIC_ASSISTANT_ID`)
- **API Format**: Messages now use Athena Engine format (mapped to legacy format for UI compatibility)

### Migration Checklist

- ✅ Update `.env.local` with Stack Auth credentials
- ✅ Ensure Athena Engine API is running at `NEXT_PUBLIC_API_URL`
- ✅ Create an agent definition with ID matching `NEXT_PUBLIC_AGENT_ID`
- ✅ Build and test locally: `pnpm build && pnpm dev`
- ✅ Sign in via Stack Auth at `/handler/sign-in`
- ✅ Test creating new sessions and streaming messages
