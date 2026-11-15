import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { TodoIdInputSchema } from "@uni-stack/core/todo";
import { deleteTodo } from "@uni-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { publishTodoChange } from "#/routers/todo/change-feed";

export const remove = protectedProcedure
  .meta(
    openapi({ description: "Delete a todo; deleting a missing todo is a no-op", method: "POST" })
  )
  .input(TodoIdInputSchema)
  .output(z.void())
  .handler(async ({ context, input }) => {
    const ownerId = context.auth.userId;
    const deleted = await deleteTodo({ id: input.id, ownerId });
    if (deleted) {
      await publishTodoChange(ownerId, context.logger);
    }
  });
