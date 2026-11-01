import { type RequestLogger } from "@tsu-stack/logger/server";

import { type OrpcContext } from "#/orpc/context";
import { authenticateClerkRequest } from "#/server/clerk";

export type CreateContextOptions = {
  logger: RequestLogger;
  request: Request;
};

export async function createContext({
  logger,
  request
}: CreateContextOptions): Promise<OrpcContext> {
  const clerkAuth = await authenticateClerkRequest(request);

  return {
    auth: clerkAuth,
    logger
  };
}
