import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

export function getAppOrigin() {
  return new URL(ENV_WEB_ISOMORPHIC.VITE_APP_URL).origin;
}

/**
 * Absolute URL of a page in apps/app.
 *
 * Entering the product is always a full-page navigation: `<Link to="/app">` would be parsed as the
 * `{-$locale}` param and 404, even when the app is served under this site's origin.
 */
export function getAppUrl(path: `/${string}` = "/") {
  return `${ENV_WEB_ISOMORPHIC.VITE_APP_URL.replace(/\/$/, "")}${path}`;
}
