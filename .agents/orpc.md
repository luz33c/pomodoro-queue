# oRPC Patterns

Use this when adding or refactoring oRPC procedures, routers, or client integration in this repo.

This guide is intentionally repo-specific. It documents the current preferred way to build oRPC routes here and should stay aligned with:

- [Logging patterns](./logging.md)
- [API fetching patterns](./api-fetching-patterns.md)

## Goals

- Keep server procedure definitions explicit and typed.
- Keep router handlers small, predictable, and easy to scan.
- When logging is explicitly needed, use request-scoped, outcome-oriented logging without duplicating middleware or global error logs.
- Prefer type-safe oRPC errors from procedure definition through client handling.
- Keep TanStack Query wrapper structure in [API fetching patterns](./api-fetching-patterns.md), not in this file.

## Package Layout

`packages/api/src` is split by role. Imports only point down the table:

| Folder     | Holds                                                                                                               | Imported by           |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `client/`  | `types.ts`, the type-only entry for app, native, and extension; `tanstack-start/` for web                           | apps                  |
| `server/`  | `rpc.ts`, `openapi.ts`, `create-context.ts`, and `clerk.ts`                                                         | `apps/server`         |
| `routers/` | One folder per slice; `routers/index.ts` assembles them into `appRouter`                                            | `client/`, `server/`  |
| `orpc/`    | `context.ts` and `procedures.ts`, the base every procedure builds on; `postgres-publisher.ts` for `changes` streams | `routers/`, `server/` |

- `package.json` exports only `./client/*` and `./server/*`, so apps cannot import `routers/` or `orpc/` directly.
- Code that several slices need lives in the slice that owns the concept. Infrastructure goes in `orpc/` (building procedures), `server/` (the HTTP edge), or a top-level folder named for the integration. There is no `lib/` folder.

## Server Route Shape

Define routes with the shared procedure factories from `packages/api/src/orpc/procedures.ts`.

- Use `publicProcedure` for public read operations.
- Use `protectedProcedure` for authenticated operations.
- Add route metadata with `.meta(openapi({ description, method }))`, importing `openapi` from `@orpc/openapi`. Meta set on a base procedure merges with the procedure's own.
- Define `input(...)` and `output(...)` schemas explicitly with Zod.
- Prefer returning repo-native shapes directly instead of renaming fields unless there is a strong product reason.

Typical shape, one procedure per file:

```ts
// packages/api/src/routers/example/procedures/by-id.ts
const exampleInputSchema = z.object({
  id: z.string().min(1)
});

const exampleOutputSchema = z.object({
  id: z.string(),
  name: z.string()
});

export const byId = publicProcedure
  .meta(
    openapi({
      description: "Get an example by ID",
      method: "GET"
    })
  )
  .input(exampleInputSchema)
  .output(exampleOutputSchema.nullable())
  .handler(async ({ input, context, errors }) => {
    // ...
  });
```

## Errors

Prefer type-safe oRPC errors with `.errors(...)` on the procedure base.

- Define expected errors up front.
- Declare on each procedure only the errors it can throw. Define an error that several procedures share once, in the slice's `errors.ts`, and pass it by name: `.errors({ TODO_NOT_FOUND })`.
- Use `errors.MY_ERROR()` in handlers.
- An error definition holds only `message` and `data`; oRPC ignores a `status` there. Give each new code its HTTP status in the slice's `errors.ts` as `<SLICE>_ERROR_STATUS`, for example `{ TODO_NOT_FOUND: 404 }`, and spread that into `server/error-status.ts`, which the RPC handler, the OpenAPI handler, and the generated spec share. A code missing from that map is sent as 400.
- Use `data` schemas only for fields the client truly needs, and never include sensitive information.
- Reserve thrown unknown errors for truly unexpected cases.
- Do not leak sensitive information through error data or messages.
- `ORPCError` is still valid when you need interoperability, but prefer `.errors(...)` so the client can infer and narrow error types.

Example:

```ts
// packages/api/src/routers/example/errors.ts
export const EXAMPLE_NOT_FOUND = {
  message: "Example not found"
};

export const EXAMPLE_ERROR_STATUS = {
  EXAMPLE_NOT_FOUND: 404
};

// a procedure
const protectedExampleProcedure = protectedProcedure.errors({
  EXAMPLE_NOT_FOUND,
  // Common codes such as TOO_MANY_REQUESTS already have a status in COMMON_ERROR_STATUS_MAP
  TOO_MANY_REQUESTS: {
    data: z.object({
      retryAfter: z.number().int().min(1)
    })
  }
});
```

Equivalent `ORPCError` throws are fine when the code and data match a defined error, but the repo default should still be the typed `errors.*(...)` form.

## Logging

oRPC handlers receive the request-scoped logger as `context.logger`.

- Follow [Logging patterns](./logging.md) for event shape, emit lifecycle, redaction, and global error handling.
- Do not add durable procedure logs unless logging was explicitly requested or the flow is audit, security, or otherwise high-risk.
- Reuse `context.logger`; do not create a standalone logger inside a procedure.
- If extra context is needed for an unexpected failure, attach it with `logger.set(...)` and let shared error handling record the failure once.
- Do not log routine reads or duplicate middleware and global error logging.

When a handler genuinely needs a durable outcome log, use one wide terminal event:

```ts
.handler(async ({ context, input, errors }) => {
  const logger = context.logger;

  logger.set({
    procedure: "profile.edit",
    profile: { id: context.auth.userId },
  });

  const row = await updateProfile(input);

  if (!row) {
    throw errors.PROFILE_NOT_FOUND();
  }

  logger.emit({
    event: "profile_edit_completed",
    profile: { id: row.id },
  });

  return row;
})
```

## Router Conventions

- Group related procedures in a slice router, for example `profileRouter`.
- Prefer straightforward names like `byId`, `search`, `edit`, `create`, `remove`.
- Use the table-level query functions from `@uni-stack/db/queries` for reusable reads and writes, and add new ones there per [Database package](../packages/db/AGENTS.md).
- Keep DB access that serves only one procedure close to the handler. If it grows, colocate it in the slice in sibling files such as `queries.ts` or `utils.ts`, not outside the slice.
- Convert server-only values to transport-safe output values at the edge, for example `Date` → ISO string.
- Keep handler logic linear and shallow. If the flow grows, extract helpers.

## Router Folder Shape

Each slice is a folder under `packages/api/src/routers/`:

```text
packages/api/src/routers/<slice>/
  index.ts        assembles the slice router from procedures/
  procedures/
    <key>.ts      one procedure per file
  errors.ts       optional: errors that several procedures share, and their HTTP statuses
  queries.ts      optional: DB access that serves only this slice
  change-feed.ts  optional: the slice's publisher for a `changes` stream (see todo/)
```

- `index.ts` imports the procedures and exports `<slice>Router`, for example `export const todoRouter = { create, update, remove }`. It holds no handler code.
- Name each procedure file after its router key in kebab-case, and export the key in camelCase: `procedures/by-id.ts` exports `byId`. Use `remove` instead of `delete`, which is not a valid binding, and avoid the keys oRPC reserves: `then`, `bind`, `call`, `apply`, `valueOf`, `toString`, `toJSON`.
- `queries.ts` owns slice-local DB readers, aggregations, transport shaping helpers, and similar reusable helpers for that router.
- `utils.ts`, `constants.ts`, or a file named for its job, such as `health/checks.ts`, are fine when the helper is still router-local.
- Nest a sub-router as a nested slice folder with its own `index.ts` and `procedures/`.
- A stream that pushes to clients is an ordinary procedure whose output is `asyncIteratorObject(schema)` and whose handler is an `async function*` that yields from the slice's publisher, passing the handler's `signal` so the subscription ends with the request. The publisher is a `PostgresPublisher` from `orpc/postgres-publisher.ts` on a channel named for the slice, such as `todo_changes`; that file ports the adapter proposed to oRPC upstream and is replaced by `@orpc/publisher/postgres` once it ships, so keep its logic and message format identical to upstream. Over `RPCLink` it is Server-Sent Events on the existing fetch, so the Bearer header, CORS, and proxies need nothing new, and oRPC writes a keep-alive comment every 15 seconds by default. Publish only after the write commits, and await it: `publish<Domain>Change(ownerId, context.logger)` logs a warning instead of failing the write when the signal cannot be sent. See `todo/change-feed.ts` and `todo/procedures/changes.ts`, and [Sync](./sync.md) for the client side.

## Shared Contracts

When an oRPC input or output schema represents a shared domain contract, source it from `packages/core` instead of redefining it locally.

- Follow [Core package patterns](./core.md) for shared enums, filters, categories, transport-safe shapes, and defaults consumed outside one router.
- Keep router-local helper queries and transport-only shapes next to the router.
- Move a helper out of its slice only when the reuse is real; [Package Layout](#package-layout) says where it goes.

## Client Error Handling

Follow [API fetching patterns](./api-fetching-patterns.md) for query and mutation file structure.

- Prefer type-safe client error handling for oRPC-backed mutations and user-visible failure states.
- Import `isDefinedError` from `@orpc/client` when narrowing mutation or action errors.
- Prefer oRPC's built-in client helpers over custom error-guard utilities when the library already provides the needed narrowing.
- Switch on `error.code` instead of string-matching `message` text.
- Read `error.data` only for errors that define typed data in `.errors(...)`.
- If AI generates generic `instanceof Error` handling for defined server errors, steer it back to the typed `isDefinedError(error)` branch.

Example:

```ts
import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { type client, orpc } from "@uni-stack/api/client/tanstack-start/orpc";

export function getEditProfileMutationOptions() {
  return orpc.profile.edit.mutationOptions({
    onError: (error) => {
      if (isDefinedError(error)) {
        switch (error.code) {
          case "PROFILE_NOT_FOUND":
            toast.error(error.message ?? "Profile not found.");
            return;
          case "RATE_LIMITED":
            toast.error(`Try again in ${error.data.retryAfter} seconds.`);
            return;
          case "DATABASE_ERROR":
            toast.error(error.message ?? "Failed to update profile.");
            return;
        }
      }

      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    }
  });
}

export function useEditProfileMutation() {
  return useMutation(getEditProfileMutationOptions());
}

export type EditProfileMutationResult = Awaited<ReturnType<typeof client.profile.edit>>;
```

## Practical Rules

- Prefer explicit `input` and `output` schemas on every procedure.
- Prefer typed oRPC errors over ad hoc string matching.
- Prefer `.errors(...)` plus `errors.MY_ERROR(...)` over raw `new ORPCError(...)` unless interoperability or framework glue makes the raw form clearer.
- Prefer `isDefinedError(error)` plus `error.code`/`error.data` for client-side branching.
- Prefer sparse, request-scoped wide events over ad hoc per-step logs.
- Prefer shared error handling over log-and-rethrow patterns in handlers.
- Prefer [API fetching patterns](./api-fetching-patterns.md) for slice-local query and mutation wrappers, preloading, and cache invalidation.
