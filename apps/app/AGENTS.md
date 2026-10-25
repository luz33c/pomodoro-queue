# apps/app

The product app: a Vite + React + TanStack Router SPA. It has no TanStack Start, no SSR, and no server functions. The same source builds for two hosts:

| Host    | Command                     | Output                                                           | Routing                                       |
| ------- | --------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| web     | `vite build`                | `dist/web`, served by `server.ts` under the `VITE_APP_URL` path  | browser history, basepath from `VITE_APP_URL` |
| desktop | `vite build --mode desktop` | `dist/desktop`, copied by `apps/desktop` into `views://mainview` | hash history, relative asset paths            |

The web build can also be served by `apps/web` on the website's origin: point `VITE_APP_URL` under `VITE_WEB_URL` (for example `https://example.com/app`) and rebuild. `apps/web/server.ts` then serves `dist/web` there, and in development Web's Vite proxies that path to this app's dev server on `:3002`. One build serves one address.

Background and deployment options: [docs/desktop-plan-c-product-app.md](../../docs/desktop-plan-c-product-app.md). Desktop shell: [Desktop](../../.agents/desktop.md).

## Boundaries

- Host differences live in `src/shared/host/`. Pages, widgets, and queries never branch on the host. The one exception is `features/auth`'s `AuthGate`, which picks the signed-out experience per host.
- Auth goes through `useAppAuth()` from `#/shared/host/auth`. Only `shared/host/auth.ts` and `shared/providers/auth-provider.tsx` import `@clerk/react`.
- Data goes through oRPC with `#/shared/api/orpc`, typed by `@tsu-stack/api/routers/types` only. Requests carry a Bearer token and never rely on cookies, because `views://` cannot store them.
- Never import `electrobun/*`, `apps/web`, or `apps/desktop`. Share code only through `packages/*`.
- `server.ts` runs directly on Node.js 24 and imports only `hono`, `@hono/node-server`, and Node built-ins. Node does not strip types from the `@tsu-stack/*` sources in `node_modules`.
- `dependencies` holds only what `server.ts` needs at runtime. Everything bundled into `dist` goes in `devDependencies`, so `pnpm deploy --prod` ships a minimal production directory.

## Structure

The app follows the same FSD layers as `apps/web` (`routes → pages → widgets → features → entities → shared`), and Oxlint enforces them. See [TanStack patterns](../../.agents/tanstack-patterns.md) for segments.

- `routes/` stays thin. `(auth)/route.tsx` wraps every signed-in page in `AuthGate` and `AppShell`.
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
