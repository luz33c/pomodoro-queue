# apps/app

The product app: a Vite + React + TanStack Router SPA. It has no TanStack Start, no SSR, and no server functions. The same source builds for two hosts:

| Host    | Command                     | Output                                                           | Routing                                       |
| ------- | --------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| web     | `vite build`                | `dist/web`, served by `server.ts` under the `VITE_APP_URL` path  | browser history, basepath from `VITE_APP_URL` |
| desktop | `vite build --mode desktop` | `dist/desktop`, copied by `apps/desktop` into `views://mainview` | hash history, relative asset paths            |

The web build can also be served by `apps/web` on the website's origin: point `VITE_APP_URL` under `VITE_WEB_URL` (for example `https://example.com/app`) and rebuild. `apps/web/server.ts` then serves `dist/web` there, and in development Web's Vite proxies that path to this app's dev server on `:3002`. One build serves one address.

Current architecture, deployment options, and remaining work: [docs/desktop-plan-c-product-app.md](../../docs/desktop-plan-c-product-app.md). Desktop shell: [Desktop](../../.agents/desktop.md).

## Boundaries

- Host differences live in `src/lib/host/`, in two implementations of one `HostAdapter` interface (`types.ts`): `web/` (Clerk, sign-in on the website, account rows in memory) and `desktop/` (the preload bridge, system-browser sign-in, SQLite). The build mode is the switch: `#/lib/host/runtime` is a conditional import in `package.json`, and `vite --mode desktop` adds the `desktop` resolve condition in `vite.config.ts`, so each build imports exactly one implementation and never bundles the other. `tsc` resolves the `default` (web) branch; the desktop implementation is checked through `satisfies HostAdapter`.
- Everything outside `lib/host/` imports only `#/lib/host/index` (`hostAdapter`, `useAppAuth`, and the shared types) and reads capabilities such as `hostAdapter.auth.signInRedirect` or `hostAdapter.storage`, never which host it runs in and never `import.meta.env.MODE`. `AuthGate` requires sign-in only when the host has a `signInRedirect`, so desktop works signed out on device rows.
- Auth goes through `useAppAuth()` from `#/lib/host/index`. Only `lib/host/web/auth.ts` imports `@clerk/react`.
- Data goes through oRPC with `#/lib/api-client/orpc`, typed by `@uni-stack/api/client/types` only. Requests carry a Bearer token and never rely on cookies, because `views://` cannot store them.
- Synced data lives in TanStack DB collections. A feature's `api/` hands its oRPC calls to `createSyncedSource` from `lib/sync/`, which works on both hosts: account rows once signed in (cached in SQLite on desktop and kept current by the server's change stream), this device's rows while signed out where the host keeps any. Components get the collection from the feature's `use<Name>Source()` hook, read with `useLiveQuery`, and write through the feature's functions. Rules for collections and writes: [Sync](../../.agents/sync.md).
- Never import `electrobun/*`, `apps/web`, or `apps/desktop`. Share code only through `packages/*`.
- `server.ts` runs directly on Node.js 24 and imports only `hono`, `@hono/node-server`, and Node built-ins. Node does not strip types from the `@uni-stack/*` sources in `node_modules`.
- `dependencies` holds only what `server.ts` needs at runtime. Everything bundled into `dist` goes in `devDependencies`, so `pnpm deploy --prod` ships a minimal production directory.

## Structure

The app follows the [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) layout. `apps/web` still uses FSD; the two apps are organized differently on purpose.

```text
src/
├── app/          main.tsx, router.ts, providers/, styles/, routes/ (TanStack file routes), routeTree.gen.ts
├── features/     one folder per product capability: auth/, dashboard/, todos/
│   └── <name>/   index.ts (the only entry other code may import), api/, components/, hooks/, stores/, types/, utils/
├── components/   UI shared across features: container, spinner-screen, errors/, layouts/app-shell/
├── hooks/        hooks shared across features (create it when the first one appears)
├── lib/          preconfigured libraries: api-client/ (oRPC, Query), host/ (web or desktop), sync/, i18n, document-title
└── config/       app.ts (name, home path, outbound URLs), nav-items.ts
```

- Imports flow one way: `lib`, `config`, `components`, and `hooks` never import `features` or `app`; `features` never import `app` or each other; `app` composes features. Oxlint enforces it with `eslint-plugin-fsd-lint` configured with these folders as layers (`.oxlintrc.jsonc`). The plugin checks `import` statements, not `export … from`.
- Code outside a feature imports it only through its `index.ts`. Inside a feature, import `.ts` files with `#/features/<name>/…` and sibling `.tsx` files with `./`, because the `#/*` mapping resolves `.ts` only (`#/components/*` and `#/app/providers/*` map to `.tsx`).
- Include only the folders a feature needs. Data a second feature must read moves out of its feature into `lib/` with a plain interface; until then it stays in the feature that owns it.
- Route files stay thin and compose features. `(auth)/route.tsx` wraps every page in `AuthGate` and `AppShell`. The gate requires sign-in only when the host has a `signInRedirect`, so a route whose feature calls a private API shows `DesktopSignIn` itself when signed out, as `(auth)/dashboard/index.tsx` does.
- `config/app.ts` owns the app name, home path, and outbound URLs. Do not hard-code them. `config/nav-items.ts` lists product pages and outbound links; the header and the narrow-screen sheet render the same lists.
- Queries live in the owning feature as `features/<name>/api/<operation>.ts`, exporting `get*QueryOptions` and `useGet*Query`. File names carry no `.query` suffix. A mutation invalidates the affected query keys before it shows success.
- Each route sets its title with `head()` and `documentTitle()`. `index.html` has no `<title>`.

## i18n

- Messages come from `@uni-stack/i18n/messages`, shared with `apps/web`. Add English keys only, following [i18n guidelines](../../.agents/i18n.md).
- Routes have no locale prefix. `lib/i18n.ts` resolves the locale once at startup (`localStorage`, then `navigator.languages`, then `baseLocale`), and switching reloads the page.
- Do not call Paraglide's `setLocale` or register its Vite plugin here. The compiled runtime is shared with `apps/web`, which compiles it with its URL strategy.

## Environment

`ENV_APP` (`@uni-stack/env/app/env`) validates `VITE_APP_URL`, `VITE_SERVER_URL`, `VITE_WEB_URL`, and `VITE_CLERK_PUBLISHABLE_KEY`. Vite compiles them into the bundle, so a desktop release build must run with production values.

## Commands

| Command                                          | Purpose                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm run dev` (root)                            | Web host at `http://localhost:3002/app`, with web, server, and i18n watch                          |
| `pnpm run dev:desktop` (root)                    | Builds `dist/desktop`, then runs `vite --mode desktop` on `:3003` next to `electrobun dev --watch` |
| `pnpm --filter @uni-stack/app run build`         | Web build to `dist/web`                                                                            |
| `pnpm --filter @uni-stack/app run build:desktop` | Desktop build to `dist/desktop`                                                                    |
| `pnpm --filter @uni-stack/app run start`         | Serve `dist/web` with `server.ts`                                                                  |
| `pnpm --filter @uni-stack/app run typecheck`     | Type-check                                                                                         |

`src/app/routeTree.gen.ts` is generated by `@tanstack/router-plugin` (`routesDirectory: ./src/app/routes` in `vite.config.ts`) during dev and build, and it is committed like `apps/web`'s. After adding a route file, run the dev server or a build once before type-checking.

## Adding A Page

1. Create `features/<name>/components/<name>-page.tsx` and export it from `features/<name>/index.ts`.
2. Create `app/routes/(auth)/<name>/index.tsx` with `head()` and the page as `component`.
3. Add an entry to `config/nav-items.ts` when the page belongs in navigation.
