import { TxidOutputSchema } from "@tsu-stack/core/sync";
import { TodoUpdateInputSchema } from "@tsu-stack/core/todo";
import { db, getCurrentTxid } from "@tsu-stack/db";
import { updateTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { TODO_NOT_FOUND } from "#/routers/todo/errors";

export const update = protectedProcedure
  .errors({ TODO_NOT_FOUND })
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
  );
