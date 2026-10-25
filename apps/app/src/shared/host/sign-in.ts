import { appConfig } from "#/shared/config/app";

/** The web sign-in page, which sends the user back to `returnTo` once Clerk has a session. */
export function getWebSignInUrl(returnTo: string) {
  const url = new URL(`${appConfig.websiteUrl.replace(/\/$/, "")}/sign-in`);
  url.searchParams.set("redirect", returnTo);
  return url.toString();
}
