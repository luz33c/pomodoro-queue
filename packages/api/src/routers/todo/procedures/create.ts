import { openapi } from "@orpc/openapi";

import { TodoCreateInputSchema, TodoRowSchema } from "@uni-stack/core/todo";
import { db } from "@uni-stack/db";
import { createTodo, getTodo } from "@uni-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { publishTodoChange } from "#/routers/todo/change-feed";
import { TODO_ID_CONFLICT } from "#/routers/todo/errors";

export const create = protectedProcedure
  .errors({ TODO_ID_CONFLICT })
  .meta(
    openapi({
      description:
        "Create a todo with a client-generated id; replaying the same id returns the stored row",
      method: "POST"
    })
  )
  .input(TodoCreateInputSchema)
  .output(TodoRowSchema)
  .handler(async ({ context, errors, input }) => {
    const ownerId = context.auth.userId;
    const { isNew, row } = await db.transaction(async (tx) => {
      const created = await createTodo({ id: input.id, ownerId, title: input.title }, tx);
      if (created) {
        return { isNew: true, row: created };
      }

      // The id exists already: a replay of this owner's own write, or another owner's row
      const existing = await getTodo({ id: input.id, ownerId }, tx);
      if (!existing) {
        throw errors.TODO_ID_CONFLICT();
      }
      return { isNew: false, row: existing };
    });

    // After the commit, so a client that refetches on the signal reads the new row; a replay changed nothing
    if (isNew) {
      await publishTodoChange(ownerId, context.logger);
    }
    return row;
  });
