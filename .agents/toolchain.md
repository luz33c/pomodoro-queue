# Node.js and pnpm

## Responsibilities

- **Node.js 24 LTS** is the development and production runtime.
- **pnpm 11.28.2** owns dependency installation, the lockfile, workspace catalogs, package scripts, workspace tasks, and one-off binaries.
- **Vite**, **Vitest**, **Oxfmt**, **Oxlint**, **tsc/tsgo**, and **tsdown** remain independent tools for their respective jobs.

Most workspaces use TypeScript 7. `apps/native` deliberately pins TypeScript 6.0.3 because Expo SDK 57 validates against that compiler line; keep the exception until Expo supports TypeScript 7.

The default React and React DOM catalog and root development dependencies keep Web, Extension, and shared-package peers on the same version. `apps/native` uses `catalog:native` to retain Expo SDK 57's React 19.2.3 pair; update it only with the Expo-supported combination.

The root `devEngines.runtime` entry pins Node.js 24.21.0. `pnpm install` downloads that runtime when needed, and project scripts launched through pnpm use it. Keep `.node-version` and `engines.node` aligned for editors and external tooling.

## CLI Mapping

| Task                            | Command                             |
| ------------------------------- | ----------------------------------- |
| Install dependencies            | `pnpm install`                      |
| Frozen install                  | `pnpm install --frozen-lockfile`    |
| Add a dependency                | `pnpm add <dep>`                    |
| Add a root dev dependency       | `pnpm add -Dw <dep>`                |
| Run a script                    | `pnpm run <script>`                 |
| Run a filtered script           | `pnpm --filter <pkg> run <script>`  |
| Run a script recursively        | `pnpm -r --if-present run <script>` |
| Run an installed package binary | `pnpm exec <bin>`                   |
| Fetch and run a one-off binary  | `pnpm dlx <pkg>`                    |

## Workspace Behavior

- Recursive tasks are dependency-topological unless explicitly run in parallel.
- Use `--parallel` only for long-running independent tasks such as development watchers.
- Use `--if-present` for recursive commands when not every workspace declares the script.
- Keep dependency versions in the pnpm catalog and retain `workspace:*` for internal packages.

## Native TypeScript

The Server development script runs its erasable TypeScript entry point directly with Node.js 24:

```sh
node --env-file=../../packages/env/.env --watch src/index.ts
```

Keep `erasableSyntaxOnly` enabled in the Server tsconfig. Node.js does not type-check or transform TypeScript-only runtime syntax such as enums and parameter properties.

The Web production launcher at `apps/web/server.ts` also runs directly on Node.js 24 and must use erasable TypeScript syntax. It is separate from `apps/web/src/server.ts`, which Vite builds as the TanStack Start request handler.

## Web Production Runtime

- TanStack Start and Vite build to `apps/web/dist/client` and `apps/web/dist/server/server.js`; retain these default paths so Start's preview and prerendering can locate the handler.
- `pnpm --filter @tsu-stack/web run start` runs the root `server.ts` with Node.js. Hono and `@hono/node-server` serve static files for GET/HEAD requests, then forward other requests to the Start handler with the configured base path intact.
- Keep sign-in and account creation out of the prerender list so session guards run for each request.
- Vite's default dependency externalization is retained. The Web Dockerfile uses `pnpm --filter @tsu-stack/web deploy --prod --legacy /prod/web` after building, then copies the deployment to `/app`. Keep `dist` and `server.ts` in the Web package's `files` list and deploy the generated production `node_modules` alongside them.
- Other platforms require their corresponding Start adapter and entry point. The default launcher and Docker image target Node.js.

## Validation

Use the repository scripts instead of calling the underlying tools independently unless a narrow diagnostic requires it:

- `pnpm run check` — formatting, lint, and type-check validation
- `pnpm run fix` — apply formatting/lint fixes, then type-check
- `pnpm run test:unit:run` — unit tests
- `pnpm run test:e2e:run` — end-to-end tests
- `pnpm --filter @tsu-stack/web run check:server` — Web production launcher smoke check

Run these commands only when the user requests or approves validation. Follow [Choice flows](./choice-flows.md) and [Workflow](./workflow.md) for the validation cadence.

## Git Hooks

Tracked hooks live in `.githooks`. The pre-commit hook is read-only and runs the repository check; it does not rewrite or restage files. Run `pnpm run fix` explicitly when fixes are desired.
