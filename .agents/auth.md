# Auth Patterns

## Architecture

Clerk is the authentication provider for Web, Native, Extension, and the API.

- **Web**: `ClerkProvider` in `apps/web/src/routes/__root.tsx` and `clerkMiddleware()` in `apps/web/src/start.ts` connect browser and server authentication.
- **SSR**: `getClerkAuthState` in `apps/web/src/features/auth/api/clerk-auth-state.functions.ts` reads the current request with Clerk's server-side `auth()` helper.
- **API**: Hono context creation verifies requests with `@clerk/backend`. Clients send a Clerk session token in `Authorization: Bearer <token>`.
- **Native**: `@clerk/expo` uses its secure token cache and an app-local token getter for oRPC.
- **Extension**: `@clerk/chrome-extension` resolves a fresh session token in the background service worker; the popup requests it through runtime messaging.

## Web Route Guards

Protected and guest-only route layouts call `getClerkAuthState()` in `beforeLoad`.

- Protected routes redirect anonymous users to `/sign-in?redirect=<current-path>`.
- Guest-only routes redirect authenticated users to the validated destination.
- Validate redirect destinations against the route tree using the existing i18n helpers.
- The protected layout also observes Clerk's client state for sign-out and session expiry.
- Preserve the existing locale and deployment-base-path handling in Clerk URLs.

Use Clerk's `SignIn`, `SignUp`, `useAuth`, and `useUser` integrations. Do not introduce a second session query or authentication provider.

## API Authentication

- `OrpcContext` exposes `auth: { userId: string } | null` and a request logger.
- `protectedProcedure` rejects requests without `context.auth.userId` with `UNAUTHORIZED`.
- Use `context.auth.userId` as the authenticated identity in handlers.
- `getClerkAuthorizedParties()` combines the Web origin with explicitly configured extra origins for API request verification and CORS.
- The Web SSR oRPC client calls the router directly and creates its own context from Clerk's request-scoped `auth()`. Keep this path aligned with Hono context creation.
- Resolve user identity per request. Never put one user's session in a process-global variable.

## Client Tokens And Cache

- Browser and Native token bridges store Clerk's `getToken` function, not a copied token. Resolve the token when making each API request.
- Clear the token getter when its bridge unmounts.
- Web clears its QueryClient when the Clerk user changes, so cached private data does not carry across accounts.
- Keep the browser-extension background token flow and configured stable extension origin intact.
- Use the existing public environment-variable prefixes for each client. Clerk secret keys remain server-only.

## Database Boundary

Clerk manages authentication records and sessions. A Clerk account is not automatically a row in the local database.

The existing `user`, `account`, `session`, and `verification` tables and their Drizzle declarations are retained pending confirmation of legacy data retention. They do not authenticate current users. Do not use them for new Clerk features or delete them through `db:push` as incidental cleanup. Their eventual removal requires a reviewed migration and an explicit decision about existing data.

Keep historical migrations intact. The API server runs pending migrations at production startup, so a destructive cleanup migration must only enter the release once its data impact is approved.

When business data needs a user reference, design it around the verified Clerk user ID and the actual domain requirements.
