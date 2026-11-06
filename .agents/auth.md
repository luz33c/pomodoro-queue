# Auth Patterns

## Architecture

Clerk is the only authentication provider for Web, Native, Extension, and the API.

- **Web**: `ClerkProvider` in `apps/web/src/routes/__root.tsx` and `clerkMiddleware()` in `apps/web/src/start.ts` connect browser and server authentication. Web owns sign-in and sign-up.
- **App**: `apps/app` mounts `@clerk/react`'s `ClerkProvider` in its web host only: `lib/host/web/auth.ts` is the one module that imports Clerk, and the desktop build never resolves it. Everything else reads auth through `useAppAuth()` from `lib/host/index.ts`. The desktop host (`lib/host/desktop/auth.ts`) mirrors the session the desktop shell keeps (see Desktop Sign-In).
- **SSR**: `getClerkAuthState` in `apps/web/src/features/auth/api/clerk-auth-state.functions.ts` reads the current request with Clerk's server-side `auth()` helper.
- **API**: Hono context creation verifies requests with `@clerk/backend`. Clients send a Clerk session token in `Authorization: Bearer <token>`.
- **Native**: `@clerk/expo` uses its secure token cache and an app-local token getter for oRPC.
- **Extension**: `@clerk/chrome-extension` resolves a fresh session token in the background service worker; the popup requests it through runtime messaging.

## Web Route Guards

Web has guest-only routes (`(guest)`: sign-in and account creation); protected product pages live in `apps/app`. The guest layout calls `getClerkAuthState()` in `beforeLoad`.

- The `redirect` search param is either an absolute App URL or a site path. `toAppRedirectUrl()` (`features/auth/lib/app-redirect.ts`) accepts an App URL only when its origin equals the App origin and its path sits under the App base path; otherwise the value is validated against the route tree with the existing i18n helpers.
- Without a `redirect`, authentication leads to the App home.
- Authenticated users are redirected right away: App URLs with `redirect({ href })` (a full-page navigation), site paths with the localized `redirect({ to })`.
- `SignIn` and `SignUp` receive App URLs unchanged as `forceRedirectUrl`; site paths get the deployment base path (`toClerkRedirectUrl()`). `ClerkProvider` lists the App origin in `allowedRedirectOrigins`, or Clerk would replace the cross-origin redirect with its default.
- Preserve the existing locale and deployment-base-path handling in Clerk URLs.
- Link into the App with absolute URLs from `shared/lib/app-url.ts`, as a full-page navigation. `<Link to="/app">` would be parsed as the `{-$locale}` param.

## App Sign-In Round Trip

1. `AuthGate` (`apps/app/src/features/auth`) waits for Clerk, then sends a signed-out user to `${VITE_WEB_URL}/sign-in?redirect=<current App URL>` with `location.replace`.
2. Web signs the user in and Clerk redirects back to that App URL.
3. The App reads the shared Clerk session and calls the API with a Bearer token.
4. Signing out in the App returns to the website (`appConfig.redirectAfterSignOut`).

Web and App must share a root domain in production (for example `example.com` and `app.example.com`) to share the Clerk session. In local development both run on `localhost` (`:3000` and `:3002`), and cookies are scoped by host, not port.

Use Clerk's `SignIn`, `SignUp`, `useAuth`, and `useUser` integrations. Do not introduce a second session query or authentication provider.

## Desktop Sign-In

The desktop app signs in with Clerk as an OAuth 2.0 provider (authorization code with PKCE), not with Clerk's browser SDK, because `views://` cannot store cookies.

1. The window calls `tsuDesktop.auth.signIn()`. The main process (`apps/desktop/src/main/lib/auth/`) starts a one-shot server on `127.0.0.1` (ports 47823–47825) and opens Clerk's `/oauth/authorize` in the system browser.
2. Clerk sends a signed-out user to its sign-in page with `redirect_url=<FAPI>/oauth/authorize-with-immediate-redirect…`, then redirects to `http://127.0.0.1:<port>/callback?code&state`.
3. The main process exchanges the code, keeps the access token in memory, and stores the refresh token in the OS credential store (`Bun.secrets`, one entry per identifier and channel). The window gets state changes as `authChanged` messages and a token per request through `authGetToken`; the refresh token never reaches the webview.
4. The API accepts the OAuth access token with `acceptsToken: ["session_token", "oauth_token"]`; `auth.userId` is the Clerk user ID either way.

Configuration: a public Clerk OAuth application per instance, with PKCE required, scopes `openid profile email offline_access`, and the three loopback redirect URIs. Its client ID is `VITE_CLERK_DESKTOP_CLIENT_ID`. Signing in does not change `dataMode`; desktop data stays local.

## API Authentication

- `OrpcContext` exposes `auth: { userId: string } | null` and a request logger.
- `protectedProcedure` rejects requests without `context.auth.userId` with `UNAUTHORIZED`.
- Use `context.auth.userId` as the authenticated identity in handlers.
- `getClerkAuthorizedParties()` combines the Web origin, the App origin (`VITE_APP_URL`), and explicitly configured extra origins (`CLERK_AUTHORIZED_PARTIES`, such as the extension or the desktop `views://mainview`) for API request verification and CORS.
- The Web SSR oRPC client calls the router directly and creates its own context from Clerk's request-scoped `auth()`. Keep this path aligned with Hono context creation.
- Resolve user identity per request. Never put one user's session in a process-global variable.

## Client Tokens And Cache

- Browser and Native token bridges store Clerk's `getToken` function, not a copied token. Resolve the token when making each API request. The App's bridge (`ApiAuthBridge` in `app/providers/auth-provider.tsx` with `lib/api-client/auth-token.ts`) reads the getter through `useAppAuth()`, so the desktop host only supplies its own getter.
- Clear the token getter when its bridge unmounts.
- Web and App clear their QueryClient when the Clerk user changes, so cached private data does not carry across accounts.
- Keep the browser-extension background token flow and configured stable extension origin intact.
- Use the existing public environment-variable prefixes for each client. Clerk secret keys remain server-only.

## Database Boundary

Clerk manages authentication records and sessions. A Clerk account is not automatically a row in the local database.

The Drizzle schema contains no authentication tables. The legacy `user`, `account`, `session`, and `verification` declarations and their relations have been removed. An appended cleanup migration drops those four legacy tables; do not recreate them for Clerk authentication or use `db:push` to replace the migration path.

Tables whose rows belong to a user store the Clerk user ID in a `text` column without a foreign key, as `todo.owner_id` does. See [Database package](../packages/db/AGENTS.md).

Keep historical migrations intact. The API server runs pending migrations at production startup, so a destructive cleanup migration must only enter the release once its data impact is approved.

When business data needs a user reference, design it around the verified Clerk user ID and the actual domain requirements.
