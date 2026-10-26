# tsu-stack

Opinionated full-stack TypeScript monorepo: TanStack Start (website) + a TanStack Router SPA (product app, also packaged as an Electrobun desktop app) + Hono + oRPC + Drizzle + Clerk + Paraglide.js (i18n), running on Node.js 24 and managed with pnpm.

## Start Here

- Start with the most specific `.agents/*.md` file for the task.
- Follow links from that file for adjacent context instead of reading several docs up front.
- Keep guidance in its owning file. Link instead of repeating rules across docs.

## Cross-Cutting Docs

- [Node.js and pnpm toolchain](.agents/toolchain.md) for runtime management, package management, workspace scripts, and CLI syntax.
- [Workflow](.agents/workflow.md) for user-directed validation timing, build checks, and migration safety.
- [Choice flows](.agents/choice-flows.md) for native approvals, structured input, validation prompts, and human decision points.
- [Logging](.agents/logging.md) only when adding, changing, or keeping durable logs.
- [Testing](.agents/testing.md) only when tests are explicitly requested or the task is test-specific.

## Topic Index

Pick the most specific file for the task. Use links within that file instead of reading the whole docs tree linearly.

### Delivery Flows

- [End-to-end feature workflow](.agents/end-to-end-features.md) for full-stack feature work spanning `packages/db`, `packages/core`, `packages/api`, and `apps/web`.

### App And Frameworks

- [Product app](apps/app/AGENTS.md) for the `apps/app` SPA: its web and desktop hosts, host seam, auth gate, page layout, and commands.
- [Desktop](.agents/desktop.md) for the `apps/desktop` Electrobun shell: toolchain, main process, `views://` behavior, navigation policy, and packaging.
- [Preview UI](apps/preview-ui/AGENTS.md) for the `apps/preview-ui` gallery of composite components in `packages/ui` and its scripted demo.
- [TanStack patterns](.agents/tanstack-patterns.md) for route structure, `beforeLoad`, layouts, and route-level preloading.
- [API fetching patterns](.agents/api-fetching-patterns.md) for slice-local TanStack Query and oRPC client wrappers in `apps/web` and `apps/app`.
- [Zustand state management](.agents/zustand.md) for complex client-owned state shared across components, and for avoiding React Context as the default mutable state tool.
- [oRPC patterns](.agents/orpc.md) for server procedures, router shape, typed errors, and request-scoped handler logging.
- [Auth patterns](.agents/auth.md) for Clerk architecture, token handling, and protected/guest route rules.
- [i18n guidelines](.agents/i18n.md) for copy keys, locale file policy, and Paraglide codegen.
- [SEO patterns](.agents/seo.md) for route `head()` usage and `@tsu-stack/seo` integration.

### Shared Packages And Platform

- [Core package patterns](.agents/core.md) for shared domain contracts in `packages/core`, file roles, and propagation into API and web code.
- [Database package](packages/db/AGENTS.md) for schema files, relations, table-level query functions, and `@tsu-stack/db` entry points.
- [Media storage and uploads](.agents/media-storage.md) for preemptive S3 object conventions, first-implementation workflow, delete policy, and storage env configuration.
- [Sync](.agents/sync.md) for Electric shapes, the `/shape` proxy, txid-returning writes, synced-table rules, and shape versioning.
- [UI guidelines](.agents/ui.md) for app UI composition, extraction decisions, and `packages/ui` boundaries.
- [TypeScript conventions](.agents/typescript.md) for schema placement, import boundaries, and `lib/` vs `utils/`.
- [Environment variables](.agents/environment-variables.md) for env scoping, validation, and Docker propagation.

## Task Entry Points

- UI work: Start with [UI guidelines](.agents/ui.md). Add [Preview UI](apps/preview-ui/AGENTS.md) when adding or changing a composite component in `packages/ui`. Add [TanStack patterns](.agents/tanstack-patterns.md) when the task touches route/file placement, loaders, or page composition. Add [Zustand state management](.agents/zustand.md) when client state must be accessed from different components.
- Product app or desktop work: Start with [Product app](apps/app/AGENTS.md). Add [Desktop](.agents/desktop.md) for the shell, packaging, or `views://` behavior, and [Auth patterns](.agents/auth.md) for the sign-in round trip with Web.
- Shared client state: Start with [Zustand state management](.agents/zustand.md). Do not use React Context unless the user explicitly asks for it.
- Bugfix: Start with the owning domain doc from the index above, then use [Workflow](.agents/workflow.md) for user-directed validation timing. Add [Core package patterns](.agents/core.md) when the fix touches shared enums, schemas, formatters, defaults, or other cross-package contracts. Add [Logging](.agents/logging.md) or [Testing](.agents/testing.md) only when the task explicitly calls for them or their policies require them.
- Uploads or object storage: Start with [Media storage and uploads](.agents/media-storage.md). Use it even for the first storage feature in this repo, then update it in the same change once the real provider, env surface, and asset purposes are known. Add [Core package patterns](.agents/core.md) when changing shared upload contracts, [oRPC patterns](.agents/orpc.md) when wiring route handlers, and [Environment variables](.agents/environment-variables.md) when storage config changes.
- End-to-end feature: Start with [End-to-end feature workflow](.agents/end-to-end-features.md), then load the relevant domain docs such as [Database package](packages/db/AGENTS.md), [Core package patterns](.agents/core.md), [oRPC patterns](.agents/orpc.md), [API fetching patterns](.agents/api-fetching-patterns.md), [TanStack patterns](.agents/tanstack-patterns.md), [Zustand state management](.agents/zustand.md), [Auth patterns](.agents/auth.md), or [UI guidelines](.agents/ui.md).

<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Vendored Skills

`.agents/skills/` holds upstream skills for libraries that do not ship skills through `@tanstack/intent`. Codex and GitHub Copilot read it directly, `.claude/skills/` symlinks it for Claude Code, and `skills-lock.json` pins each skill's source and content hash.

- Clerk (web, native, extension, webhooks, E2E): `clerk`, `clerk-tanstack-patterns`, `clerk-expo`, `clerk-chrome-extension-patterns`, `clerk-webhooks`, `clerk-testing`
- Logging and debugging: `analyze-logs` (local server logs in `apps/server/.evlog/logs/`), `review-logging-patterns`, `build-audit-logs`
- Hono server: `hono`
- shadcn/ui: `shadcn`
- Expo app: `expo-router`, `expo-data-fetching`
- UI review and React composition: `web-design-guidelines`, `vercel-composition-patterns`

Rules:

- `.agents/*.md` define this repository's conventions and take precedence over vendored skills, which carry generic upstream guidance. When a repository doc and the current code disagree, treat the code as authoritative.
- Translate `npx`, `bunx`, and `npm install` commands shown in skills to the pnpm equivalents in [Node.js and pnpm toolchain](.agents/toolchain.md), and add dependencies through the workspace catalog.
- Do not run setup CLIs that skills suggest (for example `evlog init`, `evlog agents`, `shadcn init`, or Clerk setup flows) unless the user asks; they rewrite existing wiring and docs.
- TanStack libraries and drizzle-kit already ship version-matched skills through `@tanstack/intent` (see Skill Loading); do not vendor copies of them.
- Treat `.agents/skills/` as vendored and do not hand-edit it. Add skills with `pnpm dlx skills@latest add <source> -s <skill> -a claude-code codex github-copilot`, update them with `pnpm dlx skills@latest update`, and restore them from the lockfile with `pnpm dlx skills@latest experimental_install`.

## MCP Servers

Project MCP servers are defined in `.mcp.json` for Claude Code (pre-approved in `.claude/settings.json`) and in `.codex/config.toml` for Codex. Keep the two files in sync.

- `shadcn`: search, view, and get examples or add commands for registry items; run its add commands through `pnpm run ui` (`packages/ui`) or `pnpm run ui:web` (`apps/web`), choosing the target per [UI guidelines](.agents/ui.md)
- `clerk`: Clerk SDK snippets and patterns
- `expo`: Expo and EAS tooling; requires a one-time Expo account login (`/mcp` in Claude Code, `codex mcp login expo` in Codex)

## TanStack Docs

Use `pnpm run tanstack` (aliased to `pnpm dlx @tanstack/cli@latest`) to look up TanStack documentation. Always pass `--json` for machine-readable output.

```bash
# List TanStack libraries (optionally filter by --group state|headlessUI|performance|tooling)
pnpm run tanstack libraries --json

# Fetch a specific doc page
pnpm run tanstack doc router framework/react/guide/data-loading --json
pnpm run tanstack doc query framework/react/overview --docs-version v5 --json

# Search docs (optionally filter by --library, --framework, --limit)
pnpm run tanstack search-docs "server functions" --library start --json
pnpm run tanstack search-docs "loaders" --library router --framework react --json
```

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
