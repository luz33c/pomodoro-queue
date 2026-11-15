import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { appRouter } from "#/routers/index";
import { errorStatusMap } from "#/server/error-status";

export const rpcHandler = new RPCHandler(appRouter, {
  errorStatusMap,
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "rpc" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: []
});
