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
- The main-process bundler does not resolve `#/` subpath imports (Bun reads `#/x` as a package named `#`), and `build.bun.alias` only accepts exact keys with absolute paths. `apps/desktop` therefore declares no `#/` mapping, and files in `src/bun/` import each other with same-folder `./` paths. This is the desktop exception to the import rules in [TypeScript conventions](./typescript.md).

## Main Process

- `mainProcess: "bun"` with `src/bun/index.ts` as the entry. The packaged app ships Hutch's Bun binary (about 63 MB of the 67 MB dev bundle).
- Cottontail (`mainProcess: "cottontail"`) was evaluated and runs this shell, but upstream marks it experimental. It saves about 8% of the compressed archive and still needs `@types/bun`, because it implements Bun's APIs and ships no type definitions. Hutch itself uses Cottontail internally to load the config and bundle, whatever `mainProcess` says; that is where `.cottontail-tmp/` comes from.
- `copy: { "../app/dist/desktop": "views/mainview" }` works with a path outside the project; the files land in `Resources/app/views/mainview`. Pair it with `watchIgnore: ["../app/dist/**"]`.
- View URL: in the `dev` channel, probe `http://localhost:3003` once with HEAD. A resolved response selects that URL; a rejected request selects `views://mainview/index.html`. There is no retry or automatic switch after fallback. Other channels use the packaged view directly. `Updater.localInfo.channel()` returned `dev` and `canary` in the spike.
- Navigation policy: call `window.webview.setNavigationRules(["^*", "views://*", "http://localhost:3003/*"])` right after creating the window. The `navigationRules` constructor option has no effect in 2.0.4. `^` blocks, `*` is a wildcard, and the last matching rule wins.
- External links:
  - `will-navigate` cannot be cancelled. Its `event.data.detail` is a JSON string `{ "url", "allowed" }`. When `allowed` is `false`, call `Utils.openExternal(url)`; it opens the system browser.
  - `window.open` and `target="_blank"` emit `new-window-open` (listen with `Electrobun.events.on("new-window-open")`; detail `{ url, isCmdClick, modifierFlags }`) on the native renderer only. CEF drops them without an event.
  - The app's `shared/host/external-link.ts` should navigate in the same tab, so the rules catch the link on both renderers. Dedupe when one click produces both events.

## Local Persistence

- The main process opens `tsu-app.sqlite` in `Utils.paths.userData` (`~/Library/Application Support/<identifier>/<channel>/` on macOS) and serves TanStack DB's Electron persistence protocol through a `bun:sqlite` driver (`src/bun/bun-sqlite-*.ts`).
- The preload `src/bun/webview-bridge.ts` installs `window.tsuDesktop.sqliteInvoke`, which `apps/app` reads in `shared/host/`. Calls travel as the `sqlitePersistence` RPC request with a 60 s limit (`src/bun/rpc-schema.ts`).
- Electrobun RPC sends JSON, unlike Electron's structured clone. `src/bun/rpc-codec.ts` tags `Date` values on both ends; without it, rows reload from SQLite with string timestamps and fail schema validation on their next update. It does not encode BigInt, Map, or Set.

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

- Desktop authentication is a placeholder; it does not yet create or persist a signed-in session.
- Identifier and production domain (pending). The current app config still uses `dev.tsu-stack.desktop.spike` and version `0.0.0`.
- Icons, signing and notarization, `release.baseUrl`, and a CI matrix on native runners.
