# Desktop (Electrobun)

> The runtime observations below come from the Phase 0 spike (2026-10-24), not a new validation run. Current architecture and remaining work: [docs/desktop-plan-c-product-app.md](../docs/desktop-plan-c-product-app.md). UI conventions: [apps/app/AGENTS.md](../apps/app/AGENTS.md).

`apps/desktop` is a thin Electrobun 2.x shell around `apps/app`. It owns the main process, the window, the navigation policy, and packaging. All UI comes from the app's desktop build (`vite build --mode desktop`).

Verified on macOS arm64 with Node 24.21, pnpm 11.28, and TypeScript 7.0: electrobun 2.0.4 → Hutch 0.28.1, Cottontail 0.7.2, Bun 1.4.0, CEF Chrome 147.

## Toolchain

- The `electrobun` npm package is only a bootstrap. The first `electrobun prepare|dev|build` downloads Hutch, which then downloads Cottontail, the Electrobun core, and a pinned Bun toolchain into `~/.hutch` (about 210 MB; about 520 MB after CEF is used once). Later runs reuse the cache and work offline.
- `postinstall: electrobun prepare` regenerates `.hutch/devkit`. pnpm runs it only when dependencies change, and it takes about 1 s with a warm cache. Docker installs use `--ignore-scripts`, so images never download Hutch.
- Hutch honors `HTTPS_PROXY` and `HTTP_PROXY`. Behind a TLS-intercepting proxy, the Cottontail download fails with `ReleaseDownloadFailed`; run the first prepare without the proxy variables.
- No `hutch.config.ts` is needed. Hutch neither touches `pnpm-lock.yaml` nor writes `hutch.lock`.
- Ignore `.hutch/`, `.cottontail-tmp/`, `build/`, and `artifacts/`.

## TypeScript

- Extend `./.hutch/devkit/tsconfig.json` and set `"baseUrl": null`. The devkit still sets `baseUrl`, which TypeScript 7 removed (TS5102); its `paths` keep resolving without it. Desktop stays on TypeScript 7.
- The SDK needs Bun types (`bun:ffi`, `Bun.*`, `process`). Install `@types/bun` at the Hutch Bun version (1.4.0) and set `types: ["bun"]`.
- Electrobun bundles with Cottontail, which does not resolve `#/` subpath imports ("Could not resolve: `#/shared/rpc/codec`"), and `build.bun.alias` only accepts exact keys with absolute paths. `apps/desktop` therefore maps a named prefix, `"#shared/*": "./src/shared/*.ts"`, and imports everything else with `./` paths, to the same folder or below. This is the desktop exception to the import rules in [TypeScript conventions](./typescript.md).

## Source Layout

The first level splits code by the process it runs in, like the common Electron layout:

```text
src/
├── main/          # main process (Bun)
│   ├── index.ts   # entry: opens SQLite, registers the RPC handlers, opens the window
│   ├── ui/        # native UI: the window, its view URL, the navigation policy
│   └── lib/sqlite/ # SQLite file and TanStack DB's persistence protocol over bun:sqlite
├── preload/
│   └── index.ts   # webview entry: installs window.tsuDesktop
└── shared/
    └── rpc/       # main process ↔ preload contract: schema and the Date codec
```

- `main/` and `preload/` reach `shared/` through `#shared/*` and never import each other. `preload/` must stay free of Bun-only modules such as `bun:sqlite`.
- Inside `main/`, folders import downward with `./`, and `main/index.ts` wires `ui/` and `lib/` together.

## Main Process

- `mainProcess: "bun"` with `src/main/index.ts` as the entry. The packaged app ships Hutch's Bun binary (about 63 MB of the 67 MB dev bundle).
- Cottontail (`mainProcess: "cottontail"`) was evaluated and runs this shell, but upstream marks it experimental. It saves about 8% of the compressed archive and still needs `@types/bun`, because it implements Bun's APIs and ships no type definitions. Hutch itself uses Cottontail internally to load the config and bundle, whatever `mainProcess` says; that is where `.cottontail-tmp/` comes from.
- `copy: { "../app/dist/desktop": "views/mainview" }` works with a path outside the project; the files land in `Resources/app/views/mainview`. Pair it with `watchIgnore: ["../app/dist/**"]`.
- View URL: in the `dev` channel, probe `http://localhost:3003` once with HEAD and a 1 s timeout. A resolved response selects that URL; a rejected or timed-out request selects `views://mainview/index.html`. There is no retry or automatic switch after fallback. Other channels use the packaged view directly. `Updater.localInfo.channel()` returned `dev` and `canary` in the spike.
- Navigation policy: call `window.webview.setNavigationRules(["^*", "views://*", "http://localhost:3003/*"])` right after creating the window. The `navigationRules` constructor option has no effect in 2.0.4. `^` blocks, `*` is a wildcard, and the last matching rule wins.
- External links:
  - `will-navigate` cannot be cancelled. Its `event.data.detail` is a JSON string `{ "url", "allowed" }`. When `allowed` is `false`, call `Utils.openExternal(url)`; it opens the system browser.
  - `window.open` and `target="_blank"` emit `new-window-open` (listen with `Electrobun.events.on("new-window-open")`; detail `{ url, isCmdClick, modifierFlags }`) on the native renderer only. CEF drops them without an event.
  - The app's desktop host (`hostAdapter.externalLinkProps` in `lib/host/desktop/index.ts`) navigates in the same tab, so the rules catch the link on both renderers. Dedupe when one click produces both events.

## Local Persistence

- The main process opens `tsu-app.sqlite` in `Utils.paths.userData` (`~/Library/Application Support/<identifier>/<channel>/` on macOS) and serves TanStack DB's Electron persistence protocol through a `bun:sqlite` driver (`src/main/lib/sqlite/`). It closes the database on `before-quit`, which every quit path emits, including closing the last window.
- The preload `src/preload/index.ts` installs `window.tsuDesktop.sqliteInvoke`, which `apps/app` reads in `lib/host/`. Calls travel as the `sqlitePersistence` RPC request with a 60 s limit (`src/shared/rpc/schema.ts`).
- `apps/app` and the preload each declare the `DesktopBridge` type, because apps share code only through `packages/*`. Change both together.
- Electrobun RPC sends JSON, unlike Electron's structured clone. `src/shared/rpc/codec.ts` tags `Date` values on both ends; without it, rows reload from SQLite with string timestamps and fail schema validation on their next update. It does not encode BigInt, Map, or Set.

## The `views://` Origin

Verified on WKWebView and CEF:

- `location.origin` is `views://mainview`. It is a secure context, and `crypto.subtle` exists.
- Fetches send `Origin: views://mainview` (`Sec-Fetch-Site: cross-site`), and preflights with `Authorization` succeed. The app calls the API directly; add `views://mainview` (packaged) and `http://localhost:3003` (dev) to `CLERK_AUTHORIZED_PARTIES`. No main-process proxy.
- `document.cookie` cannot be written on `views://`. Desktop sessions must be token-based.
- `localStorage` works and survives restarts. WKWebView kept one store across dev and canary builds with the same identifier; CEF keeps its own.
- Only hash routes survive a reload. Reloading `views://mainview/deep/path` fails ("Failed to read views file"); there is no `index.html` fallback.

## Renderer

- macOS uses the native renderer (WKWebView). Tailwind v4 features (`oklch`, `color-mix`, `@property`) work. The dev bundle is 67 MB; the canary update archive and DMG are about 21 MB each.
- CEF behaves the same for routing, origin, and fetch, but adds about 300 MB (dev bundle 370 MB) and drops `window.open` / `target="_blank"`.
- WKWebView follows the OS Safari version; Tailwind v4 needs Safari 16.4+ (macOS 13.3+). Older macOS, Windows (WebView2), and Linux (WebKitGTK, where upstream recommends `bundleCEF`) are untested.

## Packaging

- `pnpm run build:desktop` (root) compiles i18n messages, then runs the desktop `build:stable`, which builds the app's desktop bundle before `electrobun build`. `electrobun build --env=canary|stable` builds for the host platform only.
- The app bundle compiles `VITE_*` values in. A release build must run with production values, never the local `.env`.
- Canary output: `build/canary-macos-arm64/TSU Stack-canary.app`, a 20 MB self-extracting wrapper, and `artifacts/` (`*.app.tar.zst`, `*.dmg`, `*-update.json`). On first launch the wrapper extracts into `~/Library/Application Support/<identifier>/<channel>/`.
- Without `release.baseUrl`, delta patches are skipped. Without signing configuration, builds stay unsigned, which is fine locally.
- `icon.iconset` is missing (build warning). Add icons before a release.

## Dev Loop

- `pnpm run dev:desktop` (root) builds the app's desktop bundle once, so the copy source exists, then runs the app's `vite --mode desktop` on port 3003 next to `electrobun dev --watch`. Vite HMR reaches the window only when the startup probe selects the dev server; a fallback window stays on the static build until recreated. `--watch` rebuilds and relaunches the shell when a main-process file changes. This command does not start the API or website.
- Dev builds forward the webview console to the terminal (`[webview:1] [console.debug] …`).
- The dev server origin is `http://localhost:3003`, not `views://`. Check origin-dependent behavior with a canary build.

## Open Items

- Desktop sign-in (see [Auth patterns](./auth.md#desktop-sign-in)) has not been run end to end yet: refresh token rotation, window activation after the callback, and the Keychain prompt for an unsigned packaged build are unverified.
- Identifier and production domain (pending). The current app config still uses `dev.tsu-stack.desktop.spike` and version `0.0.0`.
- Icons, signing and notarization, `release.baseUrl`, and a CI matrix on native runners.
