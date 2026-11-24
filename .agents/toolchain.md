# Node.js and pnpm

## Responsibilities

- **Node.js 24 LTS** is the development and production runtime.
- **pnpm 11.28.2** owns dependency installation, the lockfile, workspace catalogs, package scripts, workspace tasks, and one-off binaries.
- **Vite**, **Vitest**, **Oxfmt**, **Oxlint**, **tsc/tsgo**, and **tsdown** remain independent tools for their respective jobs.

`apps/desktop` is the one runtime exception: its Electrobun main process runs on the Bun 1.4.0 toolchain that Hutch downloads into `~/.hutch`, not on Node.js. pnpm still installs and scripts it. Keep `@types/bun` at that Bun version. See [Desktop](./desktop.md).

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

## Workspace Scripts

| Root script                 | Runs                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm run dev`              | i18n watch, Server, Web (`:3000/web`), and App (`:3002/app`) in parallel                           |
| `pnpm run dev:desktop`      | App desktop build once, then the App desktop dev server (`:3003`) next to `electrobun dev --watch` |
| `pnpm run dev:native`       | Expo dev server                                                                                    |
| `pnpm run dev:extension`    | WXT dev build                                                                                      |
| `pnpm run dev:preview-ui`   | Preview UI dev server (`:3004`): composite component gallery and scripted demo                     |
| `pnpm run build:preview-ui` | Preview UI client and server build; not part of `pnpm run build`                                   |
| `pnpm run build`            | i18n compile, then Web, App (web build), Server, and Extension builds in dependency order          |
| `pnpm run build:desktop`    | i18n compile, then the desktop `build:stable` (App desktop build plus `electrobun build`)          |

Paraglide output in `packages/i18n/src/paraglide` is shared by Web and App. During `pnpm run dev`, the i18n watcher and Web's Vite plugin already write it, so package scripts avoid starting more compiles into the same folder:

- Package `predev`/`prebuild` scripts run the root `i18n:ensure`, which compiles only when the output is missing.
- Root `build` and `build:desktop` compile once before any app builds, so builds never pick up stale messages. App has no Paraglide Vite plugin, so a standalone App build after editing messages needs `pnpm --filter @uni-stack/i18n run build` first.

## Native TypeScript

The Server development script runs its erasable TypeScript entry point directly with Node.js 24:

```sh
node --env-file=../../packages/env/.env --watch src/index.ts
```

Keep `erasableSyntaxOnly` enabled in the Server tsconfig. Node.js does not type-check or transform TypeScript-only runtime syntax such as enums and parameter properties.

The Web production launcher at `apps/web/server.ts` also runs directly on Node.js 24 and must use erasable TypeScript syntax. It is separate from `apps/web/src/server.ts`, which Vite builds as the TanStack Start request handler.

## Web Production Runtime

- TanStack Start and Vite build to `apps/web/dist/client` and `apps/web/dist/server/server.js`; retain these default paths so Start's preview and prerendering can locate the handler.
- `pnpm --filter @uni-stack/web run start` runs the root `server.ts` with Node.js. Hono and `@hono/node-server` serve static files for GET/HEAD requests, then forward other requests to the Start handler with the configured base path intact.
- Keep sign-in and account creation out of the prerender list so session guards run for each request.
- Vite's default dependency externalization is retained. The Web Dockerfile uses `pnpm --filter @uni-stack/web deploy --prod --legacy /prod/web` after building, then copies the deployment to `/app`. Keep `dist` and `server.ts` in the Web package's `files` list and deploy the generated production `node_modules` alongside them.
- Other platforms require their corresponding Start adapter and entry point. The default launcher and Docker image target Node.js.

## App Production Runtime

- `apps/app` builds a static SPA to `apps/app/dist/web`. Its `server.ts` runs directly on Node.js 24 with erasable TypeScript, imports only `hono`, `@hono/node-server`, and Node built-ins, and serves under the path of `VITE_APP_URL`.
- `server.ts` serves existing files with long-lived caching for `assets/`, returns 404 for missing paths with a file extension, falls back to `index.html` for page paths, and answers `/_health`.
- The App Dockerfile builds, then runs `pnpm --filter @uni-stack/app deploy --prod --legacy /prod/app`. Only `hono` and `@hono/node-server` are production dependencies; everything bundled into `dist` is a development dependency, so the image carries no frontend packages.
- `VITE_*` values are compiled in. Rebuild the App to change `VITE_APP_URL` or any other client value.
- Same-origin variant: when `VITE_APP_URL` points under `VITE_WEB_URL` (for example `https://example.com/app`), `apps/web/server.ts` serves the App's `dist/web` at that path before its own static files and the Start handler, with the same caching and 404 rules. The Web Dockerfile conditionally builds the App using a raw URL prefix check, so use consistent URL spellings at build time. `apps/web` depends on `@uni-stack/app` so `pnpm deploy` ships the build. One App build serves one address.
- In development, Web's Vite proxies that path to the App dev server on `:3002` (HMR included), and the App dev server leaves `VITE_APP_URL`'s port to Web.
- Not yet verified: both deployment variants in Docker, and the Clerk session shared between Web and App on a real production domain. No external gateway setup exists in the repository.

## Validation

Use the repository scripts instead of calling the underlying tools independently unless a narrow diagnostic requires it:

- `pnpm run check` — formatting, lint, and type-check validation
- `pnpm run fix` — apply formatting/lint fixes, then type-check
- `pnpm run test:unit:run` — unit tests
- `pnpm run test:e2e:run` — end-to-end tests
- `pnpm --filter @uni-stack/web run check:server` — Web production launcher smoke check

Run these commands only when the user requests or approves validation. Follow [Choice flows](./choice-flows.md) and [Workflow](./workflow.md) for the validation cadence.

## Git Hooks

Tracked hooks live in `.githooks`. Both hooks are read-only; they do not rewrite, stash, or restage files. Run `pnpm run fix` explicitly when fixes are desired.

- `pre-commit` runs `lint-staged --no-stash`: `oxfmt --check` and `oxlint --type-aware` on the staged files only, so unstaged or untracked work elsewhere in the tree does not block a commit.
- `pre-push` runs the full `pnpm run check`, including every project's typecheck.
- `oxfmt` ignores `docs/`, so design docs and generated `show-me` pages never block either hook.
- Agents format the files they write as they go; see [Workflow](./workflow.md#format-every-file-you-write).
