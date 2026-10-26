import { type RouterClient } from "@orpc/server";

import { healthRouter } from "#/routers/health/index";
import { privateRouter } from "#/routers/private/index";
import { todoRouter } from "#/routers/todo/index";

export const appRouter = {
  health: healthRouter,
  private: privateRouter,
  todo: todoRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
