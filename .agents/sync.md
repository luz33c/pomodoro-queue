# Sync (Query Collections)

Postgres, through `packages/db`, is the source of truth. Clients hold rows in TanStack DB collections: a query collection that reads and writes through oRPC, which desktop caches in SQLite; and, on desktop before sign-in, a local collection persisted to SQLite. The server pushes "changed" signals over an oRPC event stream; there is no separate sync service. The comparison that led here is in [docs/show-me-sync-options-claude.html](../docs/show-me-sync-options-claude.html); the push design is in [docs/show-me-push-and-host-split-2026-11-05-claude.html](../docs/show-me-push-and-host-split-2026-11-05-claude.html).

## Server

- Each synced table has a `list` procedure that returns **all** of the signed-in user's rows. A query collection treats the result as its complete state: rows the list no longer returns are removed from the client.
- Writes go through oRPC procedures in `packages/api/src/routers/<domain>/procedures/`. `create` and `update` return the stored row so the client can apply it without refetching the list.
- Scope every read and write by `ownerId` (the Clerk user id); see [Database package](../packages/db/AGENTS.md).
- Make creates idempotent with `onConflictDoNothing` on the client-generated id. A replay returns the stored row; an id owned by another user is a typed 409 (`TODO_ID_CONFLICT`).
- Declare the row schema from `packages/core` (`TodoRowSchema`) as the `list` output. The procedure returns Drizzle rows, so it stops compiling when a column is renamed, removed, or retyped.
- Pin the table row to the core row in `packages/api/src/routers/<domain>/contract.ts` (see `todo/contract.ts`). The `list` output alone misses a column added to the table but not to the core row, because Zod strips it; the contract fails typecheck and names the column.
- Each synced table has a `changes` procedure: an `eventIterator` output that stays open and yields one event per change of the signed-in user's rows. The slice's `change-feed.ts` holds an `EventPublisher` keyed by `ownerId`; every write procedure calls `publish<Domain>Change(ownerId)` after its write commits and only when something changed (a create replay or a delete of a missing row publishes nothing). Events carry no rows.
- The publisher is in-process. With more than one server instance, relay it through Postgres `LISTEN/NOTIFY` inside `change-feed.ts`; procedures and clients stay as they are.

## Client Collections

- A feature builds its collections in `features/<name>/api/` with `createSyncedSource` from `apps/app/src/lib/sync/` and exposes `use<Name>Source()`, which returns the collection to show and its scope (`account` or `device`), or null while sign-in is restoring. Components never pick a collection themselves, and features never read the host: storage comes from `hostAdapter.storage` (see [apps/app/AGENTS.md](../apps/app/AGENTS.md)).
- Account rows: the feature's `account(id, cache)` returns `createCollection(cache(queryCollectionOptions(...)))`, with `queryFn` calling the `list` procedure and `queryKey` from `orpc.<domain>.list.queryKey()`. `createSyncedSource` calls it once per signed-in user with collection id `<name>:<userId>` and registers it with `registerUserScopedCollection`, so a user change drops its rows.
  - `cache` is the host's: identity on the web; on desktop it wraps the options in `persistedCollectionOptions`, so each account's rows show at once and stay readable offline. A cache whose `schemaVersion` no longer matches is dropped and refetched.
- Handlers call the oRPC procedure, then apply the result before they resolve. They return nothing; the query collection does not refetch on its own:
  - insert and update: `await collection.utils.writeUpsert(rows)` with the rows the server returned.
  - delete: `await collection.utils.refetch()`. A direct `writeDelete` throws when the synced list no longer has the row.
  - Without either step, the optimistic change reverts to the last synced state when the handler settles.
- Changes from other devices arrive by push. While a page shows an account collection, `useLiveChanges` (`lib/sync/live-changes.ts`) holds one `changes` stream per collection, refetches once on every connect, and refetches on every event. A dropped stream reconnects after 1, 2, 4… up to 30 seconds. Do not add `refetchInterval` or other polling.
- Device rows (desktop, signed out): `hostAdapter.storage.deviceCollection` persists a local-only collection in the shell's SQLite file with id `<name>-local`. Device rows have no owner, so they move into an account only when the user asks: `features/todos/utils/import-local-todos.ts` sends each row through the account collection's handlers, oldest first, and deletes it from the device once the account has it.
- A device collection throws when its stored `schemaVersion` does not match. Device rows have no server copy, so plan a local migration before changing their shape.
- The SQLite file uses TanStack DB's own layout: one `c_<hash>` table per collection with each row as JSON in `value`, mapped through `collection_registry`. It does not mirror the Postgres tables; only the row shape (`TodoRowSchema`) is shared. Do not read or write it directly.
- Callers learn a write's outcome from `transaction.when("settled")`, which rejects when the handler throws and the optimistic change rolls back.

## Limits

- An event only says "changed"; every event costs one full `list` refetch, and the writing device refetches its own change too. When a user's rows grow large, send the changed rows in the event and apply them with `writeUpsert` / `writeDelete`, or switch the collection to `syncMode: "on-demand"`.
- No offline write queue: a write that fails while offline rolls back. Add `@tanstack/offline-transactions` when offline writes are needed.
- TanStack DB is on the 1.0 release-candidate line (`@tanstack/db` 1.0.0-rc.1.3, `@tanstack/query-db-collection` 1.5.1). Upgrade the five catalog entries together: the Electron main and renderer packages must share a protocol version, and two copies of `@tanstack/db` throw `DuplicateDbInstanceError` in dev.
