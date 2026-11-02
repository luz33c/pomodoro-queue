import { TodoRowSchema, TodoUpdateInputSchema } from "@tsu-stack/core/todo";
import { updateTodo } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { TODO_NOT_FOUND } from "#/routers/todo/errors";

export const update = protectedProcedure
  .errors({ TODO_NOT_FOUND })
  .route({ description: "Update a todo's title or completion", method: "POST" })
  .input(TodoUpdateInputSchema)
  .output(TodoRowSchema)
  .handler(async ({ context, errors, input }) => {
    const updated = await updateTodo(
      { id: input.id, ownerId: context.auth.userId },
      { completed: input.completed, title: input.title }
    );
    if (!updated) {
      throw errors.TODO_NOT_FOUND();
    }
    return updated;
  });
