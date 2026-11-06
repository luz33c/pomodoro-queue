import { createBrowserHistory } from "@tanstack/react-router";

import { type HostAdapter } from "#/lib/host/types";
import { ClerkAuthProvider, getWebSignInUrl, useClerkAppAuth } from "#/lib/host/web/auth";
import { webStorage } from "#/lib/host/web/storage";

/** The browser build: Clerk sessions, sign-in on the website, account rows in memory. */
export const host = {
  auth: {
    browserSignIn: null,
    Provider: ClerkAuthProvider,
    signInRedirect: getWebSignInUrl,
    useAuth: useClerkAppAuth
  },
  externalLinkProps: { rel: "noopener noreferrer", target: "_blank" },
  router: {
    basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
    createHistory: () => createBrowserHistory()
  },
  storage: webStorage
} satisfies HostAdapter;
