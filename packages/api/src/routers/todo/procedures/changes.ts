import { openapi } from "@orpc/openapi";
import { asyncIteratorObject } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "#/orpc/procedures";
import { subscribeTodoChanges } from "#/routers/todo/change-feed";

/**
 * A stream that stays open and sends one event each time the user's todos change on any device.
 * Events carry no rows: clients refetch `list`, which is the whole state.
 */
export const changes = protectedProcedure
  .meta(
    openapi({
      description: "Stream a signal each time the current user's todos change",
      method: "GET"
    })
  )
  .output(asyncIteratorObject(z.object({ at: z.string() })))
  .handler(async function* ({ context, signal }) {
    yield* subscribeTodoChanges(context.auth.userId, signal);
  });
