import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { type Collection, createCollection } from "@tanstack/react-db";

import { type TodoRow, TodoRowSchema } from "@uni-stack/core/todo";

import { client, orpc } from "#/lib/api-client/orpc";
import { queryClient } from "#/lib/api-client/query-client";
import {
  type CacheAccountRows,
  createSyncedSource,
  type SyncedSource
} from "#/lib/sync/create-synced-source";

export type TodoCollection = Collection<TodoRow, string | number>;

export type TodoSource = SyncedSource<TodoRow>;

// Query collections key rows by string | number; the device collection matches so either can back a page
const getKey = (todo: TodoRow): string | number => todo.id;

/**
 * The account's todos through oRPC. `todo.list` is the whole synced state: rows it no longer returns
 * are removed. Each handler applies the server's result before it resolves; otherwise the optimistic
 * change reverts when it settles. Other devices' changes arrive through `todo.changes`.
 */
function createAccountTodoCollection(id: string, cache: CacheAccountRows) {
  return createCollection(
    cache(
      queryCollectionOptions({
        getKey,
        id,
        onDelete: async ({ collection, transaction }) => {
          await Promise.all(
            transaction.mutations.map((mutation) =>
              client.todo.remove({ id: mutation.original.id })
            )
          );
          // A direct delete throws for a row the synced list no longer has; a refetch reconciles either way
          await collection.utils.refetch();
        },
        onInsert: async ({ collection, transaction }) => {
          const rows = await Promise.all(
            transaction.mutations.map((mutation) =>
              client.todo.create({ id: mutation.modified.id, title: mutation.modified.title })
            )
          );
          await collection.utils.writeUpsert(rows);
        },
        onUpdate: async ({ collection, transaction }) => {
          const rows = await Promise.all(
            transaction.mutations.flatMap(({ changes, original }) =>
              // The server owns updatedAt; only these fields are writable
              changes.completed === undefined && changes.title === undefined
                ? []
                : [
                    client.todo.update({
                      completed: changes.completed,
                      id: original.id,
                      title: changes.title
                    })
                  ]
            )
          );
          await collection.utils.writeUpsert(rows);
        },
        queryClient,
        queryFn: () => client.todo.list(),
        queryKey: orpc.todo.list.queryKey(),
        schema: TodoRowSchema
      })
    )
  );
}

const todoSync = createSyncedSource({
  account: createAccountTodoCollection,
  getKey,
  name: "todo",
  schema: TodoRowSchema,
  schemaVersion: 1,
  subscribeChanges: (signal) => client.todo.changes(undefined, { signal })
});

/** This device's own todos, kept without an account. Null where the host keeps nothing on the device. */
export const todoDeviceCollection = todoSync.device;

/** The todos a page shows and where they live. Null while sign-in is restoring. */
export const useTodoSource = todoSync.useSource;
