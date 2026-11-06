import { createClerkClient } from "@clerk/backend";
import { isMachineToken } from "@clerk/backend/internal";

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

// A token of a type outside acceptsToken yields an auth object without userId.
function toClerkContextAuth(auth: object | null): ClerkContextAuth | null {
  const userId = auth && "userId" in auth ? auth.userId : null;
  return typeof userId === "string" && userId ? { userId } : null;
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Verifies the request's Clerk bearer token: a session token from Web, App, Native, or Extension,
 * or an OAuth access token from the desktop app, which signs in through Clerk's OAuth flow.
 * Clerk checks azp against authorizedParties for every JWT, and OAuth access tokens carry no azp,
 * so only session tokens get the authorized-party check.
 */
export async function authenticateClerkRequest(request: Request): Promise<ClerkContextAuth | null> {
  const token = getBearerToken(request);
  const requestState =
    token && isMachineToken(token)
      ? await clerkClient.authenticateRequest(request, { acceptsToken: "oauth_token" })
      : await clerkClient.authenticateRequest(request, {
          acceptsToken: "session_token",
          authorizedParties: getClerkAuthorizedParties()
        });
  return toClerkContextAuth(requestState.toAuth());
}
