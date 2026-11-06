import { ENV_APP } from "@uni-stack/env/app/env";

type AppConfig = {
  /** Shown in the shell header and as the document title suffix. */
  appName: string;
  /** Where `/` and the shell logo lead; the web sign-in sends users back to the page they asked for instead. */
  homePath: "/dashboard";
  /** The marketing site, which also owns sign-in and sign-up. */
  websiteUrl: string;
  /** Where signing out lands: the website, since sign-in lives there. */
  redirectAfterSignOut: string;
  /** API reference opened from the shell. */
  apiDocsUrl: string;
};

export const appConfig = Object.freeze({
  apiDocsUrl: `${ENV_APP.VITE_SERVER_URL.replace(/\/$/, "")}/docs`,
  appName: "tsu!stack",
  homePath: "/dashboard",
  redirectAfterSignOut: ENV_APP.VITE_WEB_URL,
  websiteUrl: ENV_APP.VITE_WEB_URL
} as const satisfies AppConfig);
