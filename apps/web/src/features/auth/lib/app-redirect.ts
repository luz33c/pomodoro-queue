import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";

import { getAppUrl } from "#/shared/lib/app-url";

/** An absolute URL inside apps/app, as opposed to a path inside this site. */
export type AppRedirectUrl = `http://${string}` | `https://${string}`;

/** Where authentication leads: an apps/app URL or a path inside this site. */
export type AuthRedirectTarget = NavigateTo | AppRedirectUrl;

/** The product's home page, where authentication leads when no destination was given. */
export function getAppHomeUrl() {
  return getAppUrl() as AppRedirectUrl;
}

/**
 * Accepts a post-authentication destination only when it points into apps/app.
 * Compares the parsed origin and whole path segments, never a string prefix, so it cannot become an open redirect.
 */
export function toAppRedirectUrl(raw: string | undefined): AppRedirectUrl | null {
  if (!raw) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const appUrl = new URL(ENV_WEB_ISOMORPHIC.VITE_APP_URL);
  const basePath = appUrl.pathname.replace(/\/$/, "");
  const isInsideApp =
    basePath === "" || url.pathname === basePath || url.pathname.startsWith(`${basePath}/`);

  return url.origin === appUrl.origin && isInsideApp ? (url.toString() as AppRedirectUrl) : null;
}

export function isAppRedirectUrl(value: string): value is AppRedirectUrl {
  return /^https?:\/\//.test(value);
}
