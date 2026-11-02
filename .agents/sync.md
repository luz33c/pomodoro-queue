# Sync (Query Collections)

Postgres, through `packages/db`, is the source of truth. Clients hold rows in TanStack DB collections: in the cloud, a query collection that reads and writes through oRPC; on desktop, a local collection persisted to SQLite. There is no sync service. The comparison that led here is in [docs/show-me-sync-options-claude.html](../docs/show-me-sync-options-claude.html).

## Server

- Each synced table has a `list` procedure that returns **all** of the signed-in user's rows. A query collection treats the result as its complete state: rows the list no longer returns are removed from the client.
- Writes go through oRPC procedures in `packages/api/src/routers/<domain>/procedures/`. `create` and `update` return the stored row so the client can apply it without refetching the list.
- Scope every read and write by `ownerId` (the Clerk user id); see [Database package](../packages/db/AGENTS.md).
- Make creates idempotent with `onConflictDoNothing` on the client-generated id. A replay returns the stored row; an id owned by another user is a typed 409 (`TODO_ID_CONFLICT`).
- Declare the row schema from `packages/core` (`TodoRowSchema`) as the `list` output. The procedure returns Drizzle rows, so it stops compiling when the table and the core row drift apart.

## Client Collections

- Each synced entity has one collection in `apps/app/src/entities/<name>/lib/`, chosen by data mode (see [apps/app/AGENTS.md](../apps/app/AGENTS.md) for why the check is a literal build-mode comparison).
- `cloud` (web host): `queryCollectionOptions` from `@tanstack/query-db-collection`, with `queryFn` calling the `list` procedure and `queryKey` from `orpc.<domain>.list.queryKey()`. Register it with `registerUserScopedCollection` so a user change drops its rows.
- Handlers call the oRPC procedure, then apply the result and return `{ refetch: false }`:
  - insert and update: `await collection.utils.writeUpsert(rows)` with the rows the server returned.
  - delete: `await collection.utils.refetch()`. A direct `writeDelete` throws when the synced list no longer has the row.
  - Without either step, the optimistic change reverts to the last synced state when the handler settles.
- Changes from other devices arrive when the query refetches: window focus, reconnect, invalidation, or a `refetchInterval` if one is set.
- `local` (desktop host, for now): `persistedCollectionOptions` without a sync adapter, stored in the desktop shell's SQLite file. Give it its own collection id (`todo-local`).
- A local-only collection throws when its stored `schemaVersion` does not match. Local rows have no server copy, so plan a local migration before changing their shape.

## Limits

- No push: another device's change shows up on the next refetch, not immediately.
- Every refetch returns the full list. When a user's rows grow large, switch the collection to `syncMode: "on-demand"` or paginate.
- No offline write queue: a write that fails while offline rolls back. Add `@tanstack/offline-transactions` when offline writes are needed.
- `@tanstack/query-db-collection` is pinned to 1.4.8 to match `@tanstack/db` 0.15. That version still refetches after every handler unless it returns `{ refetch: false }`; 1.5 needs `@tanstack/db` 1.0.
