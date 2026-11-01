# apps/app

The product app: a Vite + React + TanStack Router SPA. It has no TanStack Start, no SSR, and no server functions. The same source builds for two hosts:

| Host    | Command                     | Output                                                           | Routing                                       |
| ------- | --------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| web     | `vite build`                | `dist/web`, served by `server.ts` under the `VITE_APP_URL` path  | browser history, basepath from `VITE_APP_URL` |
| desktop | `vite build --mode desktop` | `dist/desktop`, copied by `apps/desktop` into `views://mainview` | hash history, relative asset paths            |

The web build can also be served by `apps/web` on the website's origin: point `VITE_APP_URL` under `VITE_WEB_URL` (for example `https://example.com/app`) and rebuild. `apps/web/server.ts` then serves `dist/web` there, and in development Web's Vite proxies that path to this app's dev server on `:3002`. One build serves one address.

Current architecture, deployment options, and remaining work: [docs/desktop-plan-c-product-app.md](../../docs/desktop-plan-c-product-app.md). Desktop shell: [Desktop](../../.agents/desktop.md).

## Boundaries

- Host differences live in `src/shared/host/`. Pages, widgets, and queries never branch on the host. `AuthGate` branches on `dataMode` from `shared/host/persistence.ts` instead: `cloud` in the web host, `local` in the desktop host until desktop sign-in and sync exist. An entity picks its collection with the literal `import.meta.env.MODE === "desktop"`, because the bundler drops the desktop SQLite packages from the web build only when the dead branch sits in the same module.
- Auth goes through `useAppAuth()` from `#/shared/host/auth`. Only `shared/host/auth.ts` and `shared/providers/auth-provider.tsx` import `@clerk/react`.
- Data goes through oRPC with `#/shared/api/orpc`, typed by `@tsu-stack/api/client/types` only. Requests carry a Bearer token and never rely on cookies, because `views://` cannot store them.
- Synced data lives in TanStack DB collections in `entities/<name>/lib/`. In `cloud` mode a collection streams a server shape through `getShapeOptions()` and writes through oRPC, holding each optimistic change until its txid syncs back. In `local` mode it is a local-only collection persisted to the desktop shell's SQLite file. Pages read with `useLiveQuery` and write through the entity's functions. Rules for shapes and writes: [Sync](../../.agents/sync.md).
- Never import `electrobun/*`, `apps/web`, or `apps/desktop`. Share code only through `packages/*`.
- `server.ts` runs directly on Node.js 24 and imports only `hono`, `@hono/node-server`, and Node built-ins. Node does not strip types from the `@tsu-stack/*` sources in `node_modules`.
- `dependencies` holds only what `server.ts` needs at runtime. Everything bundled into `dist` goes in `devDependencies`, so `pnpm deploy --prod` ships a minimal production directory.

## Structure

The app follows the same FSD layers as `apps/web` (`routes → pages → widgets → features → entities → shared`), and Oxlint enforces them. See [TanStack patterns](../../.agents/tanstack-patterns.md) for segments.

- `routes/` stays thin. `(auth)/route.tsx` wraps every page in `AuthGate` and `AppShell`. The gate requires sign-in only in `cloud` mode, so a page that calls a private API shows `DesktopSignInPlaceholder` itself when signed out, as the dashboard does.
- `shared/config/app.ts` owns the app name, home path, and outbound URLs. Do not hard-code them.
- `widgets/app-shell/config/nav-items.ts` lists product pages and outbound links. The header and the narrow-screen sheet render the same lists.
- Queries live in the owning slice as `<slice>/api/<operation>.ts`, exporting `get*QueryOptions` and `useGet*Query`. File names carry no `.query` suffix. A mutation invalidates the affected query keys before it shows success.
- Each route sets its title with `head()` and `documentTitle()`. `index.html` has no `<title>`.

## i18n

- Messages come from `@tsu-stack/i18n/messages`, shared with `apps/web`. Add English keys only, following [i18n guidelines](../../.agents/i18n.md).
- Routes have no locale prefix. `shared/i18n/locale.ts` resolves the locale once at startup (`localStorage`, then `navigator.languages`, then `baseLocale`), and switching reloads the page.
- Do not call Paraglide's `setLocale` or register its Vite plugin here. The compiled runtime is shared with `apps/web`, which compiles it with its URL strategy.

## Environment

`ENV_APP` (`@tsu-stack/env/app/env`) validates `VITE_APP_URL`, `VITE_SERVER_URL`, `VITE_WEB_URL`, and `VITE_CLERK_PUBLISHABLE_KEY`. Vite compiles them into the bundle, so a desktop release build must run with production values.

## Commands

| Command                                          | Purpose                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm run dev` (root)                            | Web host at `http://localhost:3002/app`, with web, server, and i18n watch                          |
| `pnpm run dev:desktop` (root)                    | Builds `dist/desktop`, then runs `vite --mode desktop` on `:3003` next to `electrobun dev --watch` |
| `pnpm --filter @tsu-stack/app run build`         | Web build to `dist/web`                                                                            |
| `pnpm --filter @tsu-stack/app run build:desktop` | Desktop build to `dist/desktop`                                                                    |
| `pnpm --filter @tsu-stack/app run start`         | Serve `dist/web` with `server.ts`                                                                  |
| `pnpm --filter @tsu-stack/app run typecheck`     | Type-check                                                                                         |

`src/routeTree.gen.ts` is generated by `@tanstack/router-plugin` during dev and build, and it is committed like `apps/web`'s. After adding a route file, run the dev server or a build once before type-checking.

## Adding A Page

1. Create `pages/<name>/ui/<name>-page.tsx` and export it from `pages/<name>/index.ts`.
2. Create `routes/(auth)/<name>/index.tsx` with `head()` and the page as `component`.
3. Add an entry to `widgets/app-shell/config/nav-items.ts` when the page belongs in navigation.
