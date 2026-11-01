# Sync (Electric)

Postgres, through `packages/db`, stays the source of truth. Reads stream to clients as Electric shapes; writes go through oRPC and return the Postgres transaction id so clients can tell when their write has synced back. Clients hold the rows in TanStack DB collections. The plan lives in [docs/show-me-offline-sync-claude.html](../docs/show-me-offline-sync-claude.html).

## Pieces

| Piece                                | Where                                   | Role                                                                                      |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Electric 1.8.1                       | `electric` service in the compose files | Reads Postgres logical replication and serves shapes over HTTP. Only the server calls it. |
| `GET /shape/:name/:version`          | `packages/api/src/server/shape.ts`      | Verifies the Clerk bearer token, resolves the shape, and forwards to Electric.            |
| Shape registry                       | `packages/api/src/sync/shapes.ts`       | Fixes each shape's table, columns, and `where`. Clients never send them.                  |
| Shape proxy                          | `packages/api/src/server/shape.ts`      | Passes only Electric protocol params, binds the user id to `$1`, and adds the secret.     |
| `SHAPE_VERSIONS`, `TxidOutputSchema` | `packages/core/src/sync/`               | Shared shape versions and the write result contract.                                      |
| `getCurrentTxid`                     | `packages/db/src/txid.ts`               | Reads `pg_current_xact_id()` inside the write transaction.                                |

## Synced Tables

- Primary key: a `uuid` the client generates, so a row created offline keeps its id. Keep `.defaultRandom()` as a fallback.
- An owner column (`owner_id`, the Clerk user id). Every shape's `where` filters on it with `$1`; a shape without an owner filter is a data leak.
- List columns explicitly in the shape. A new column stays private until a shape version lists it.
- Electric adds the table to `electric_publication_default` and sets `REPLICA IDENTITY FULL` the first time a shape asks for it. That requires its database role to own the table. Where it does not, create the publication and set the replica identity in a migration instead.

## Writes

- Mutations go through oRPC procedures in `packages/api/src/routers/<domain>/`, never through Electric.
- Return `TxidOutputSchema`. Call `getCurrentTxid(tx)` inside the same `db.transaction` as the write; a txid from another transaction never shows up in the stream.
- Make creates idempotent with `onConflictDoNothing` on the id, so offline retries are safe. A replay returns `txid: null`; an id owned by another user is a typed 409 (`TODO_ID_CONFLICT`).
- `txid: null` means nothing was written and there is nothing to wait for. Removing a missing row returns it too.

## Shape Versions And Schema Changes

- Clients address shapes by name and version (`/shape/todo/1`). When a shape's column list changes, bump its entry in `SHAPE_VERSIONS` and add the new `columns` version next to the old one. Remove an old version only when no shipped client requests it.
- Change synced tables in three steps: expand (add nullable or defaulted columns), migrate clients to the new shape version, then contract (drop old columns) in a later migration. Dropping or renaming a column that a live shape version lists breaks that version.
- DDL on a synced table makes Electric discard the table's shapes. Clients get `409 must-refetch` and resync from scratch, so batch migrations to synced tables.
- Schema changes still follow [Workflow](./workflow.md#database-schema-changes) and the [Database package](../packages/db/AGENTS.md).

## Client Collections

- Each synced entity has one collection in `apps/app/src/entities/<name>/lib/`, chosen by data mode (see [apps/app/AGENTS.md](../apps/app/AGENTS.md) for why the check is a literal build-mode comparison).
- `cloud` (web host): `electricCollectionOptions` with `getShapeOptions(name)`, which builds the versioned shape URL, sends a fresh Bearer token per request, maps snake_case columns to camelCase, and parses `timestamptz` to `Date`. Handlers call the oRPC procedure and `await collection.utils.awaitTxId(txid)` for every non-null txid, so optimistic rows stay until the write streams back. Register the collection with `registerUserScopedCollection` so a user change drops its rows.
- `local` (desktop host, for now): `persistedCollectionOptions` without a sync adapter, stored in the desktop shell's SQLite file. Give it its own collection id (`todo-local`), separate from the cloud one.
- The row schema lives in `packages/core` (`TodoRowSchema`) and is the collection's `schema`. `packages/api/src/sync/shapes.ts` stops compiling when the Drizzle row and the core row drift apart.
- A local-only collection throws when its stored `schemaVersion` does not match. Local rows have no server copy, so plan a local migration before changing their shape.

## Environment And Local Dev

- `ELECTRIC_URL` and `ELECTRIC_SECRET` are documented in `packages/env/.env.example`. Development defaults `ELECTRIC_URL` to `http://localhost:3605`. In production, leaving it unset turns sync off and `/shape` answers 503.
- `pnpm run db:dev:start` starts Postgres with `wal_level=logical` and Electric on port 3605 with `ELECTRIC_INSECURE=true`, so local development needs no secret. The root compose files run Electric with `ELECTRIC_SECRET` and point the server at `http://electric:3000`.
- The server's CORS config exposes the `electric-*` response headers, and `/shape` responses carry `Vary: Authorization`. `/shape` is excluded from request logging because every open client long-polls it.
