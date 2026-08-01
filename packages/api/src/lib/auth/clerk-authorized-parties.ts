import { ENV_SERVER } from "@tsu-stack/env/server/env";

function getConfiguredParties() {
  return ENV_SERVER.CLERK_AUTHORIZED_PARTIES.split(",")
    .map((party) => party.trim())
    .filter(Boolean);
}

export function getClerkAuthorizedParties() {
  return [...new Set([new URL(ENV_SERVER.VITE_WEB_URL).origin, ...getConfiguredParties()])];
}
