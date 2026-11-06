import { createHashHistory } from "@tanstack/react-router";

import { desktopBrowserSignIn, useDesktopAppAuth } from "#/lib/host/desktop/auth";
import { desktopStorage } from "#/lib/host/desktop/storage";
import { type HostAdapter } from "#/lib/host/types";

/**
 * The Electrobun build: sign-in through the system browser, works signed out on this device's rows,
 * and caches account rows in the shell's SQLite file. Clerk is never imported here.
 */
export const host = {
  auth: {
    browserSignIn: desktopBrowserSignIn,
    Provider: ({ children }) => children,
    signInRedirect: null,
    useAuth: useDesktopAppAuth
  },
  // The shell hands navigations away from its own origins to the system browser, and its renderer
  // drops target="_blank", so desktop links navigate in place
  externalLinkProps: {},
  router: {
    // views:// has no index.html fallback, so routes live in the hash
    basepath: "/",
    createHistory: () => createHashHistory()
  },
  storage: desktopStorage
} satisfies HostAdapter;
