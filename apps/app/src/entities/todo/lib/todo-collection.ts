import {
  type ElectricCollectionUtils,
  electricCollectionOptions
} from "@tanstack/electric-db-collection";
import { persistedCollectionOptions } from "@tanstack/electron-db-sqlite-persistence";
import { type Collection, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";

import { type TodoRow, TodoRowSchema } from "@tsu-stack/core/todo";

import { client } from "#/shared/api/orpc";
import { getShapeOptions } from "#/shared/api/shape-options";
import { registerUserScopedCollection } from "#/shared/api/user-scoped-collections";
import { getLocalPersistence } from "#/shared/host/persistence";

// Electric collections key rows by string | number; the local ones match so either can back todoCollection
const getKey = (todo: TodoRow): string | number => todo.id;

/** Holds each optimistic change until Electric streams back the transaction that wrote it. */
async function awaitSynced(utils: ElectricCollectionUtils<TodoRow>, txids: Array<number | null>) {
  // A null txid means the server wrote nothing, so there is no change to wait for
  await Promise.all(txids.flatMap((txid) => (txid === null ? [] : [utils.awaitTxId(txid)])));
}

function createCloudTodoCollection() {
  const collection = createCollection(
    electricCollectionOptions({
      getKey,
      id: "todo",
      onDelete: async ({ collection, transaction }) => {
        const results = await Promise.all(
          transaction.mutations.map((mutation) => client.todo.remove({ id: mutation.original.id }))
        );
        await awaitSynced(
          collection.utils,
          results.map((result) => result.txid)
        );
      },
      onInsert: async ({ collection, transaction }) => {
        const results = await Promise.all(
          transaction.mutations.map((mutation) =>
            client.todo.create({ id: mutation.modified.id, title: mutation.modified.title })
          )
        );
        await awaitSynced(
          collection.utils,
          results.map((result) => result.txid)
        );
      },
      onUpdate: async ({ collection, transaction }) => {
        const results = await Promise.all(
          transaction.mutations.map(async ({ changes, original }) =>
            // The server owns updatedAt; only these fields are writable
            changes.completed === undefined && changes.title === undefined
              ? { txid: null }
              : client.todo.update({
                  completed: changes.completed,
                  id: original.id,
                  title: changes.title
                })
          )
        );
        await awaitSynced(
          collection.utils,
          results.map((result) => result.txid)
        );
      },
      schema: TodoRowSchema,
      shapeOptions: getShapeOptions("todo")
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
