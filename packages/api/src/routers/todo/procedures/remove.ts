import { z } from "zod";

import { TodoIdInputSchema } from "@tsu-stack/core/todo";
import { deleteTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";

export const remove = protectedProcedure
  .route({ description: "Delete a todo; deleting a missing todo is a no-op", method: "POST" })
  .input(TodoIdInputSchema)
  .output(z.void())
  .handler(async ({ context, input }) => {
    await deleteTodo({ id: input.id, ownerId: context.auth.userId });
  });
