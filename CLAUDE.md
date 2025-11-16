# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 chat interface for Anthropic Claude agents, built with React 19, TypeScript, and Tailwind CSS. The application enables real-time streaming conversations with the Anthropic Claude Agent SDK backend (project-athena-agent-anthropic), supporting multimodal inputs (text, images, PDFs), artifact rendering in a side panel, and tool call visualization.

The backend is a FastAPI server that wraps the Anthropic Claude SDK and provides Server-Sent Events (SSE) streaming for real-time message delivery.

## Development Commands

- `pnpm dev` — Start local development server at http://localhost:3000
- `pnpm build` — Create production build (verify this passes before PRs)
- `pnpm start` — Serve production build locally
- `pnpm lint` / `pnpm lint:fix` — Run ESLint with TypeScript support
- `pnpm format` / `pnpm format:check` — Format with Prettier + Tailwind plugin

## Architecture

### Provider Hierarchy

The application uses a specific provider nesting order (see `app/page.tsx`):

```
ThreadProvider → StreamProvider → ArtifactProvider → Thread
```

- **ThreadProvider** (`providers/Thread.tsx`): Manages thread list fetching and state using a custom API client (`lib/api-client.ts`). Uses `nuqs` for syncing `threadId` with URL params.
- **StreamProvider** (`providers/Stream.tsx`): Uses a custom `useStream` hook (`hooks/use-stream.ts`) to handle streaming messages via Server-Sent Events (SSE), optimistic UI updates, and connection to the FastAPI backend. Displays setup form if `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_ASSISTANT_ID` are missing.
- **ArtifactProvider** (`components/thread/artifact.tsx`): Portal-based system for rendering artifacts in a side panel. Uses React context to coordinate between artifact triggers in messages and the `ArtifactContent`/`ArtifactTitle` components.

### State Management

- **URL State**: Uses `nuqs` library for managing `threadId`, `apiUrl`, `assistantId`, and `hideToolCalls` in URL query params
- **LocalStorage**: API keys stored in `localStorage` via `lib/api-key.tsx`
- **Stream State**: The custom `useStream` hook (`hooks/use-stream.ts`) manages messages via `stream.state.messages`, loading states via `stream.loading`, and thread interrupts via `stream.interrupt()`
- **Artifact State**: Context-based state for opening/closing artifacts and passing context between runs

### Message Flow

1. User submits input via the form in `components/thread/index.tsx`
2. `ensureToolCallsHaveResponses` (`lib/ensure-tool-responses.ts`) adds synthetic tool responses for any AI messages with tool calls that lack corresponding tool messages (prefixed with `DO_NOT_RENDER_ID_PREFIX`)
3. Messages submitted via `stream.submit()` with optimistic updates
4. StreamProvider handles `onThreadId` callback to sync URL and refetch thread list
5. Messages filtered by `DO_NOT_RENDER_ID_PREFIX` before rendering
6. `HumanMessage` and `AssistantMessage` components handle rendering of different message types

### Artifact System

Artifacts are rendered in a side panel using a portal-based architecture:

- Custom UI components call `useArtifact()` hook to get an `ArtifactContent` component and control functions
- Clicking artifact triggers calls `setOpen(true)` which opens the side panel
- `ArtifactContent` portals the artifact's children into the panel via `ArtifactSlot`
- Artifacts can provide `context` that gets passed to subsequent runs via `stream.submit()`
- The artifact panel appears to the right of the main chat when `artifactOpen` is true

### Backend Architecture

The application communicates with a FastAPI backend server that wraps the Anthropic Claude Agent SDK:

- **API Client** (`lib/api-client.ts`): Custom HTTP client for making requests to the FastAPI backend
- **SSE Streaming** (`lib/sse-stream.ts`): Utilities for parsing Server-Sent Events streams from the backend
- **Custom useStream Hook** (`hooks/use-stream.ts`): React hook that manages streaming state, optimistic updates, and SSE connection lifecycle
- Backend repository: `project-athena-agent-anthropic` (FastAPI + Anthropic SDK)

The frontend connects directly to the FastAPI backend via `NEXT_PUBLIC_API_URL` (default: http://localhost:8000).

### Message Hiding

Messages can be hidden from the UI:
- Prefix message IDs with `do-not-render-` to hide permanently (defined in `lib/ensure-tool-responses.ts` as `DO_NOT_RENDER_ID_PREFIX`)
- Filtered in `components/thread/index.tsx` before mapping to message components

## Key Files and Patterns

### Import Aliasing
All imports use `@/` prefix (e.g., `@/components/ui/button`) which maps to the project root via `tsconfig.json` paths.

### Component Organization
- `components/ui/` — Radix UI primitives styled with Tailwind
- `components/thread/` — Chat-specific components (messages, artifact, syntax highlighting)
- `components/thread/agent-inbox/` — Components for handling interrupted states and tool calls
- `components/thread/messages/` — Individual message type renderers (`ai.tsx`, `human.tsx`, `tool-calls.tsx`, `generic-interrupt.tsx`)
- `lib/` — Utility modules (API client, SSE streaming, multimodal utils, type definitions)
- `hooks/` — Custom React hooks (`use-stream.ts`, `use-file-upload.ts`, etc.)
- `providers/` — React context providers (`Stream.tsx`, `Thread.tsx`)

### Styling Conventions
- Uses custom Tailwind utilities: `shadow-wave-button`, `shadow-wave-panel`, `shadow-wave-embossed`
- `cn()` helper from `lib/utils.ts` for conditional class merging
- Neobrutalist design system with rounded borders and custom shadows

### Message Content Blocks
The app supports multimodal content via `useFileUpload` hook:
- Images: jpeg, png, gif, webp
- Documents: PDF
- Content blocks rendered via `ContentBlocksPreview` component
- Drag-and-drop and paste support built into the main textarea

## Environment Variables

**Client-side (prefix with `NEXT_PUBLIC_`):**
- `NEXT_PUBLIC_API_URL` — FastAPI backend URL (default: `http://localhost:8000`)
- `NEXT_PUBLIC_ASSISTANT_ID` — Assistant ID to use (default: `athena`)
- `NEXT_PUBLIC_API_KEY` — Optional API key for authenticating requests to the backend

**Example `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ASSISTANT_ID=athena
# NEXT_PUBLIC_API_KEY=your-api-key-here
```

The backend server (project-athena-agent-anthropic) requires its own environment configuration with the Anthropic API key.

## Code Style

- TypeScript strict mode enabled
- Prefer explicit return types for hooks and server actions
- Component files use kebab-case (`password-input.tsx`), exports use PascalCase
- Hooks follow `use-*.ts` naming convention in `hooks/` directory
- Use `cn()` for className composition instead of string concatenation
- Follow existing Conventional Commit style: `feat:`, `fix:`, `chore:`, `docs:`

## Testing

No automated test runner is configured. Manual QA should:
- Start the FastAPI backend server (project-athena-agent-anthropic)
- Test streaming conversations with the Anthropic Claude Agent
- Verify artifact panel opening/closing
- Test multimodal file uploads (images and PDFs)
- Verify tool call visibility toggle
- Test thread history navigation
- Verify thread persistence across page refreshes

**Testing Workflow:**
1. Start backend: `cd project-athena-agent-anthropic && uv run python -m src.api.main`
2. Start frontend: `pnpm dev`
3. Navigate to http://localhost:3000
4. Test creating new threads and streaming responses

## Known Limitations

Some features from the original LangGraph implementation are not yet available in the Anthropic backend:
- Message branching and metadata (`getMessagesMetadata`, `BranchSwitcher`)
- Message editing functionality
- Resume with command options (interrupt resume uses simplified API)
- Custom UI components feature
- Advanced stream options (streamMode, streamSubgraphs, streamResumable)
- Error state handling (errors logged to console only)

These limitations are documented in the code via `console.warn()` statements and comments.
