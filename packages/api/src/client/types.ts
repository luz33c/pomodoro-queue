/**
 * Type-only entry point for client bundles (product app, browser extension, native app).
 *
 * Those consumers compile with `verbatimModuleSyntax`, where an inline type import such as
 * `import { type AppRouterClient } from "#/routers/index"` is preserved as a side-effect import
 * and would pull the server routers, database client, and `postgres` into the client bundle.
 * This module erases to nothing at build time, so importing types from here is safe.
 */
export type { AppRouter, AppRouterClient } from "#/routers/index";
