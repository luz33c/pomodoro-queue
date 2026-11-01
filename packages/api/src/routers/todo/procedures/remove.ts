import { TxidOutputSchema } from "@tsu-stack/core/sync";
import { TodoIdInputSchema } from "@tsu-stack/core/todo";
import { db, getCurrentTxid } from "@tsu-stack/db";
import { deleteTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";

export const remove = protectedProcedure
  .route({ description: "Delete a todo; deleting a missing todo writes nothing", method: "POST" })
  .input(TodoIdInputSchema)
  .output(TxidOutputSchema)
  .handler(({ context, input }) =>
    db.transaction(async (tx) => {
      const deleted = await deleteTodo({ id: input.id, ownerId: context.auth.userId }, tx);
      return { txid: deleted ? await getCurrentTxid(tx) : null };
    })
  );
