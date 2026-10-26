import { TxidOutputSchema } from "@tsu-stack/core/sync";
import {
  TodoCreateInputSchema,
  TodoIdInputSchema,
  TodoUpdateInputSchema
} from "@tsu-stack/core/todo";
import { db, getCurrentTxid } from "@tsu-stack/db";
import { createTodo, deleteTodo, getTodo, updateTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/lib/procedures/factory";

// Writes for the synced todo shape. Clients wait for the returned txid on the shape stream;
// a null txid means nothing was written, so there is nothing to wait for.
const todoProcedure = protectedProcedure.errors({
  TODO_ID_CONFLICT: {
    message: "This todo id belongs to another owner",
    status: 409
  },
  TODO_NOT_FOUND: {
    message: "Todo not found",
    status: 404
  }
});

export const todoRouter = {
  create: todoProcedure
    .route({
      description: "Create a todo with a client-generated id; replaying the same id writes nothing",
      method: "POST"
    })
    .input(TodoCreateInputSchema)
    .output(TxidOutputSchema)
    .handler(({ context, errors, input }) =>
      db.transaction(async (tx) => {
        const ownerId = context.auth.userId;
        const created = await createTodo({ id: input.id, ownerId, title: input.title }, tx);
        if (created) {
          return { txid: await getCurrentTxid(tx) };
        }

        // The id exists already: a replay of this owner's own write, or another owner's row
        const existing = await getTodo({ id: input.id, ownerId }, tx);
        if (!existing) {
          throw errors.TODO_ID_CONFLICT();
        }
        return { txid: null };
      })
    ),
  update: todoProcedure
    .route({ description: "Update a todo's title or completion", method: "POST" })
    .input(TodoUpdateInputSchema)
    .output(TxidOutputSchema)
    .handler(({ context, errors, input }) =>
      db.transaction(async (tx) => {
        const updated = await updateTodo(
          { id: input.id, ownerId: context.auth.userId },
          { completed: input.completed, title: input.title },
          tx
        );
        if (!updated) {
          throw errors.TODO_NOT_FOUND();
        }
        return { txid: await getCurrentTxid(tx) };
      })
    ),
  remove: todoProcedure
    .route({ description: "Delete a todo; deleting a missing todo writes nothing", method: "POST" })
    .input(TodoIdInputSchema)
    .output(TxidOutputSchema)
    .handler(({ context, input }) =>
      db.transaction(async (tx) => {
        const deleted = await deleteTodo({ id: input.id, ownerId: context.auth.userId }, tx);
        return { txid: deleted ? await getCurrentTxid(tx) : null };
      })
    )
};
