# tsu!stack Project

An opinionated Node.js 24 LTS monorepo. pnpm 11.28.2 owns dependency installation, the lockfile, workspace tasks, package scripts, one-off CLIs, and the pinned Node.js runtime. Use `pnpm install` for dependencies, `pnpm run <script>` for package scripts, `pnpm exec <bin>` for installed binaries, and `pnpm dlx <pkg>` for one-off packages.

## Tech Stack

| Package        | Role                                                 |
| -------------- | ---------------------------------------------------- |
| TanStack Start | Full-stack React framework with SSR and prerendering |
| Hono           | Node.js API server and Web production launcher       |
| oRPC           | RPC layer + OpenAPI/Scalar docs                      |
| Drizzle ORM    | Type-safe ORM                                        |
| PostgreSQL     | Primary database                                     |
| Better Auth    | Self-hosted auth                                     |
| Paraglide.js   | Compiled i18n                                        |
| shadcn/ui      | Component library                                    |

## Monorepo Structure

```
apps/server   - Hono API server (port 5000, path /server)
apps/web      - TanStack Start web app (port 3000, path /web)
packages/api  - oRPC routers & client where all the API logic lives with OpenAPI metadata
packages/auth - Better Auth config
packages/db   - Drizzle schemas & migrations, run `pnpm run db:*` from the workspace root to manage the database
packages/env  - Shared env validation (.env lives here)
packages/i18n - Paraglide i18n + Vite plugin
packages/logger - Logtape isomorphic logger (client + server) with designated categories
packages/ui   - shadcn/ui components shared across all apps/*
tools/tsconfig - Shared TypeScript base config
```

The Web app uses Vite's default `dist/client` and `dist/server/server.js` outputs. Its root `server.ts` runs on Node.js 24 with Hono and `@hono/node-server`; `src/server.ts` remains the Start request handler. See [the toolchain guide](../.agents/toolchain.md#web-production-runtime) for runtime and packaging details.

## Key Commands

> Run package scripts and workspace tasks through pnpm so they use the project-pinned Node.js runtime.

| Command                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| `pnpm run dev`             | Start all dev servers concurrently           |
| `pnpm run check`           | Check formatting, lint, and types            |
| `pnpm run fix`             | Apply formatting/lint fixes, then type-check |
| `pnpm run test:unit:run`   | Run all unit tests                           |
| `pnpm run test:e2e:run`    | Run all end-to-end tests                     |
| `pnpm run build`           | Build all packages                           |
| `pnpm run db:dev:start`    | Start local PostgreSQL (Docker)              |
| `pnpm run db:dev:stop`     | Stop local PostgreSQL                        |
| `pnpm run db:migrate`      | Run Drizzle migrations                       |
| `pnpm run db:generate`     | Generate Drizzle migration files             |
| `pnpm run db:studio`       | Open Drizzle Studio                          |
| `pnpm run auth:secret`     | Generate a Better Auth secret                |
| `pnpm run docker:up`       | Start full stack in Docker                   |
| `pnpm run docker:up:build` | Rebuild and start full stack in Docker       |

> Use `pnpm exec <bin>` for an installed package binary and `pnpm dlx <pkg>` for a one-off package.

## Environment Variables

All environment variables live in `packages/env/.env` (copy from `packages/env/.env.example`).
