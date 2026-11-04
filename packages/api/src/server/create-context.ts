import { createRequestLogger, type RequestLogger } from "@uni-stack/logger/server";

import { type OrpcContext } from "#/orpc/context";
import { authenticateClerkRequest } from "#/server/clerk";

export type CreateContextOptions = {
  /**
   * The request logger from the Hono middleware. Paths the middleware excludes, such as
   * health checks, get none even though Hono types it as always set.
   */
  logger: RequestLogger | undefined;
  request: Request;
};

export async function createContext({
  logger,
  request
}: CreateContextOptions): Promise<OrpcContext> {
  const clerkAuth = await authenticateClerkRequest(request);

  return {
    auth: clerkAuth,
    // Never emitted, so excluded paths stay out of the logs; handlers still get a logger to call
    logger:
      logger ?? createRequestLogger({ method: request.method, path: new URL(request.url).pathname })
  };
}
