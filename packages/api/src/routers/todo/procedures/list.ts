import { z } from "zod";

import { TodoRowSchema } from "@tsu-stack/core/todo";
import { listTodos } from "@tsu-stack/db/queries";

import { protectedProcedure } from "#/orpc/procedures";

export const list = protectedProcedure
  .route({ description: "List all of the current user's todos", method: "GET" })
  .output(z.array(TodoRowSchema))
  .handler(({ context }) => listTodos({ ownerId: context.auth.userId }));
