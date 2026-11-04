import { createClerkClient } from "@clerk/backend";

import { ENV_SERVER } from "@uni-stack/env/server/env";

import { type ClerkContextAuth } from "#/orpc/context";

const clerkClient = createClerkClient({
  publishableKey: ENV_SERVER.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: ENV_SERVER.CLERK_SECRET_KEY
});

function getConfiguredParties() {
  return ENV_SERVER.CLERK_AUTHORIZED_PARTIES.split(",")
    .map((party) => party.trim())
    .filter(Boolean);
}

export function getClerkAuthorizedParties() {
  return [
    ...new Set([
      new URL(ENV_SERVER.VITE_WEB_URL).origin,
      new URL(ENV_SERVER.VITE_APP_URL).origin,
      ...getConfiguredParties()
    ])
  ];
}

function toClerkContextAuth(auth: { userId: string | null } | null): ClerkContextAuth | null {
  return auth?.userId ? { userId: auth.userId } : null;
}

/** Verifies the request's Clerk bearer token. */
export async function authenticateClerkRequest(request: Request): Promise<ClerkContextAuth | null> {
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties: getClerkAuthorizedParties()
  });
  return toClerkContextAuth(requestState.toAuth());
}
