# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 chat interface for LangGraph agents, built with React 19, TypeScript, and Tailwind CSS. The application enables real-time streaming conversations with LangGraph servers, supporting multimodal inputs (text, images, PDFs), artifact rendering in a side panel, and tool call visualization.

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

- **ThreadProvider** (`providers/Thread.tsx`): Manages thread list fetching and state using the LangGraph SDK client. Uses `nuqs` for syncing `threadId` with URL params.
- **StreamProvider** (`providers/Stream.tsx`): Wraps `useStream` from `@langchain/langgraph-sdk/react` to handle streaming messages, UI messages, and connection to the LangGraph server. Displays setup form if `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_ASSISTANT_ID` are missing.
- **ArtifactProvider** (`components/thread/artifact.tsx`): Portal-based system for rendering artifacts in a side panel. Uses React context to coordinate between artifact triggers in messages and the `ArtifactContent`/`ArtifactTitle` components.

### State Management

- **URL State**: Uses `nuqs` library for managing `threadId`, `apiUrl`, `assistantId`, and `hideToolCalls` in URL query params
- **LocalStorage**: API keys stored in `localStorage` via `lib/api-key.tsx`
- **Stream State**: The `useStream` hook manages messages, loading states, and thread interrupts
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

### API Passthrough

Production deployments use `app/api/[..._path]/route.ts` which proxies requests to the LangGraph server:
- Requires `LANGGRAPH_API_URL` and `LANGSMITH_API_KEY` env vars (server-side only)
- Set `NEXT_PUBLIC_API_URL` to `https://your-domain.com/api` to route through the proxy
- This avoids exposing LangSmith API keys to the client

### Message Hiding

Messages can be hidden from the UI:
- Prefix message IDs with `do-not-render-` to hide permanently
- Add `langsmith:nostream` tag to chat models to prevent streaming display
- Filtered in `components/thread/index.tsx` before mapping to message components

## Key Files and Patterns

### Import Aliasing
All imports use `@/` prefix (e.g., `@/components/ui/button`) which maps to the project root via `tsconfig.json` paths.

### Component Organization
- `components/ui/` — Radix UI primitives styled with Tailwind
- `components/thread/` — Chat-specific components (messages, artifact, syntax highlighting)
- `components/thread/agent-inbox/` — Components for handling interrupted states and tool calls
- `components/thread/messages/` — Individual message type renderers (`ai.tsx`, `human.tsx`, `tool-calls.tsx`)

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
- `NEXT_PUBLIC_API_URL` — LangGraph API URL (or proxy URL like `https://example.com/api`)
- `NEXT_PUBLIC_ASSISTANT_ID` — Graph/assistant ID to use

**Server-side (for API passthrough):**
- `LANGGRAPH_API_URL` — Actual LangGraph server URL
- `LANGSMITH_API_KEY` — API key injected into proxied requests

## Code Style

- TypeScript strict mode enabled
- Prefer explicit return types for hooks and server actions
- Component files use kebab-case (`password-input.tsx`), exports use PascalCase
- Hooks follow `use-*.ts` naming convention in `hooks/` directory
- Use `cn()` for className composition instead of string concatenation
- Follow existing Conventional Commit style: `feat:`, `fix:`, `chore:`, `docs:`

## Testing

No automated test runner is configured. Manual QA should:
- Test streaming with a LangGraph server
- Verify artifact panel opening/closing
- Test multimodal file uploads
- Verify tool call visibility toggle
- Test thread history navigation
