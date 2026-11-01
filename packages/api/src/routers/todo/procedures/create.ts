import { TxidOutputSchema } from "@tsu-stack/core/sync";
import { TodoCreateInputSchema } from "@tsu-stack/core/todo";
import { db, getCurrentTxid } from "@tsu-stack/db";
import { createTodo, getTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { TODO_ID_CONFLICT } from "#/routers/todo/errors";

export const create = protectedProcedure
  .errors({ TODO_ID_CONFLICT })
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
  );
