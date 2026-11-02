import { persistedCollectionOptions } from "@tanstack/electron-db-sqlite-persistence";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { type Collection, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";

import { type TodoRow, TodoRowSchema } from "@tsu-stack/core/todo";

import { client, orpc } from "#/shared/api/orpc";
import { queryClient } from "#/shared/api/query-client";
import { registerUserScopedCollection } from "#/shared/api/user-scoped-collections";
import { getLocalPersistence } from "#/shared/host/persistence";

// Query collections key rows by string | number; the local ones match so either can back todoCollection
const getKey = (todo: TodoRow): string | number => todo.id;

/**
 * `todo.list` is the whole synced state: rows it no longer returns are removed. Writes apply the
 * row the server returns, so a change shows up without fetching the whole list again. Changes from
 * other devices arrive when the query refetches (window focus, reconnect, or invalidation).
 */
function createCloudTodoCollection() {
  const collection = createCollection(
    queryCollectionOptions({
      getKey,
      id: "todo",
      onDelete: async ({ collection, transaction }) => {
        await Promise.all(
          transaction.mutations.map((mutation) => client.todo.remove({ id: mutation.original.id }))
        );
        // A direct delete throws for a row the synced list no longer has; a refetch reconciles either way
        await collection.utils.refetch();
        return { refetch: false };
      },
      onInsert: async ({ collection, transaction }) => {
        const rows = await Promise.all(
          transaction.mutations.map((mutation) =>
            client.todo.create({ id: mutation.modified.id, title: mutation.modified.title })
          )
        );
        await collection.utils.writeUpsert(rows);
        return { refetch: false };
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
        return { refetch: false };
      },
      queryClient,
      queryFn: () => client.todo.list(),
      queryKey: orpc.todo.list.queryKey(),
      schema: TodoRowSchema
    })
  );

  registerUserScopedCollection(collection);
  return collection;
}

function createLocalTodoCollection() {
  const persistence = getLocalPersistence();

  if (!persistence) {
    // The desktop build opened in a plain browser has no bridge; rows then last until reload
    return createCollection(
      localOnlyCollectionOptions({ getKey, id: "todo-local", schema: TodoRowSchema })
    );
  }

  // Bump schemaVersion when TodoRow changes: local rows have no server copy, so a bump also needs a local migration
  return createCollection(
    persistedCollectionOptions({
      getKey,
      id: "todo-local",
      persistence,
      schema: TodoRowSchema,
      schemaVersion: 1
    })
  );
}

// Same condition as dataMode, written as a literal: the web build drops the desktop SQLite
// packages only when the bundler sees the dead branch in this module, and it does not fold dataMode
export const todoCollection: Collection<TodoRow, string | number> =
  import.meta.env.MODE === "desktop" ? createLocalTodoCollection() : createCloudTodoCollection();

export function insertTodo(title: string) {
  const now = new Date();

  // The id is generated here so a retried create never writes a second row. The server sets
  // the owner from the session; in the cloud the synced row replaces this placeholder.
  return todoCollection.insert({
    completed: false,
    createdAt: now,
    id: crypto.randomUUID(),
    ownerId: "",
    title,
    updatedAt: now
  });
}

export function setTodoCompleted(id: string, completed: boolean) {
  return todoCollection.update(id, (draft) => {
    draft.completed = completed;
    draft.updatedAt = new Date();
  });
}

export function deleteTodo(id: string) {
  return todoCollection.delete(id);
}
