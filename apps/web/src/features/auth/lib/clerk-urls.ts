import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";

import { type AuthRedirectTarget, isAppRedirectUrl } from "#/features/auth/lib/app-redirect";

function getWebBasePath() {
  const pathname = new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname.replace(/\/$/, "");
  return pathname === "/" ? "" : pathname;
}

export function toClerkAppPath(to: NavigateTo) {
  const rawPath = String(to);
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${getWebBasePath()}${path}` || "/";
}

/** Where Clerk sends the user after authentication: an apps/app URL as-is, or a path inside this site. */
export function toClerkRedirectUrl(redirectTo: AuthRedirectTarget) {
  return isAppRedirectUrl(redirectTo) ? redirectTo : toClerkAppPath(redirectTo);
}

export function toClerkAuthPath(
  path: "/sign-in" | "/create-an-account",
  redirectTo: AuthRedirectTarget
) {
  const authPath = toClerkAppPath(path);
  const redirect = String(redirectTo);

  if (!redirect || redirect === "/") {
    return authPath;
  }

  const params = new URLSearchParams({ redirect });
  return `${authPath}?${params.toString()}`;
}
