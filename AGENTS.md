# Repository Guidelines

- `app` hosts Next.js App Router routes, server actions, and layouts. Group related flows inside route folders (e.g., `app/(dashboard)`) and keep page metadata in the nearest `layout.tsx`.
- `components` contains reusable UI primitives (`components/ui`), chat widgets (`components/thread`), and icon wrappers; co-locate component-specific styles with the component file.
- `hooks`, `lib`, and `providers` centralize shared utilities and context wrappers—import from these modules before duplicating logic in routes.
- Static assets (logos, fonts, manifest) live under `public/`.

## Build, Test, and Development Commands
- `pnpm dev` — local development server at `http://localhost:3000` with hot reload.
- `pnpm build` — optimized production bundle; run before every PR to verify route groups compile.
- `pnpm start` — serves the build output locally to mirror the Vercel runtime.
- `pnpm lint` / `pnpm lint:fix` — TypeScript-aware ESLint checks defined in `eslint.config.js`.
- `pnpm format` / `pnpm format:check` — Prettier (with the Tailwind plugin) enforces attribute ordering and consistent spacing.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer explicit return types for hooks and server actions, and justify any `any` usage in a code comment.
- Shared hooks live in `hooks/use-*.ts`. Components are PascalCase, files use kebab-case (`password-input.tsx`) unless exporting a layout.
- Use Tailwind utility classes and the shared `cn` helper instead of bespoke CSS, and break complex JSX into focused components under `components`.

## Testing Guidelines
- No automated runner ships with the repo yet; include manual QA notes in every PR and, when practical, add React Testing Library specs alongside the component (`component-name.test.tsx`).
- Exercise streaming flows by running `pnpm dev` against the Athena Engine API. Sign in via the built-in Stack Auth handler, then verify prompts, artifact panels, settings forms, and SSE behaviors end-to-end.

## Commit & Pull Request Guidelines
- Follow the existing Conventional Commit style (`feat:`, `fix:`, `chore:`, `docs:`). Scope optional but helpful (`feat(ui): add turn timer`). Keep subject lines under 72 characters.
- Each PR should include: clear summary, screenshots or screen recordings for UI-facing changes, reproduction steps, and linked GitHub issues. Request review once `pnpm build` and `pnpm lint` pass locally, and mention any non-obvious trade-offs.

## Security & Configuration Tips
- Never commit `.env*` files; document required keys (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY`, `NEXT_PUBLIC_AGENT_ID`, `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`) in the PR body instead.
- All requests run through Stack Auth (`StackProvider`, `/handler/[...stack]`). Keep Stack credentials scoped to local `.env` files and ensure reviewers can authenticate before QAing changes.
- Use the built-in API passthrough when debugging production links, and avoid logging LangSmith or Athena API secrets—prefer server actions for any sensitive hops.
