import { TodoRowSchema, TodoUpdateInputSchema } from "@uni-stack/core/todo";
import { updateTodo } from "@uni-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";
import { publishTodoChange } from "#/routers/todo/change-feed";
import { TODO_NOT_FOUND } from "#/routers/todo/errors";

export const update = protectedProcedure
  .errors({ TODO_NOT_FOUND })
  .route({ description: "Update a todo's title or completion", method: "POST" })
  .input(TodoUpdateInputSchema)
  .output(TodoRowSchema)
  .handler(async ({ context, errors, input }) => {
    const ownerId = context.auth.userId;
    const updated = await updateTodo(
      { id: input.id, ownerId },
      { completed: input.completed, title: input.title }
    );
    if (!updated) {
      throw errors.TODO_NOT_FOUND();
    }
    publishTodoChange(ownerId);
    return updated;
  });
