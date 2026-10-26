import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { baseLocale, type Locale } from "@tsu-stack/i18n/runtime";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";

import { type AuthRedirectTarget, isAppRedirectUrl } from "#/features/auth/lib/app-redirect";

function getWebBasePath() {
  const pathname = new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname.replace(/\/$/, "");
  return pathname === "/" ? "" : pathname;
}

/**
 * The browser pathname of a site path: base path, then the locale prefix that the base locale omits.
 * Clerk matches its `path` against `location.pathname`, so a missing `/de` leaves its card blank.
 */
export function toClerkAppPath(to: NavigateTo, locale: Locale) {
  const rawPath = String(to);
  const path = stripLocalePrefix(rawPath.startsWith("/") ? rawPath : `/${rawPath}`);
  const localePrefix = locale === baseLocale ? "" : `/${locale}`;
  const localizedPath = localePrefix && path === "/" ? localePrefix : `${localePrefix}${path}`;
  return `${getWebBasePath()}${localizedPath}` || "/";
}

/** Where Clerk sends the user after authentication: an apps/app URL as-is, or a path inside this site. */
export function toClerkRedirectUrl(redirectTo: AuthRedirectTarget, locale: Locale) {
  return isAppRedirectUrl(redirectTo) ? redirectTo : toClerkAppPath(redirectTo, locale);
}

export function toClerkAuthPath(
  path: "/sign-in" | "/create-an-account",
  redirectTo: AuthRedirectTarget,
  locale: Locale
) {
  const authPath = toClerkAppPath(path, locale);
  const redirect = String(redirectTo);

  if (!redirect || redirect === "/") {
    return authPath;
  }

  const params = new URLSearchParams({ redirect });
  return `${authPath}?${params.toString()}`;
}
