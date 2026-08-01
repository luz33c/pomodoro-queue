import { createClerkClient } from "@clerk/backend";
import { type Context as HonoContext } from "hono";

import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { getClerkAuthorizedParties } from "#@/lib/auth/clerk-authorized-parties";
import { type ClerkContextAuth, type OrpcContext } from "#@/lib/context/types";

const clerkClient = createClerkClient({
  publishableKey: ENV_SERVER.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: ENV_SERVER.CLERK_SECRET_KEY
});

function toClerkContextAuth(auth: { userId: string | null } | null): ClerkContextAuth | null {
  return auth?.userId ? { userId: auth.userId } : null;
}

async function authenticateClerkRequest(request: Request): Promise<ClerkContextAuth | null> {
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties: getClerkAuthorizedParties()
  });
  return toClerkContextAuth(requestState.toAuth());
}

export type CreateContextOptions = {
  context: HonoContext;
  logger: RequestLogger;
};

export async function createContext({
  context,
  logger
}: CreateContextOptions): Promise<OrpcContext> {
  const clerkAuth = await authenticateClerkRequest(context.req.raw);

  return {
    auth: clerkAuth,
    logger,
    session: null
  };
}
