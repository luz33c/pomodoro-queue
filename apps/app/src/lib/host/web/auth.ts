import { ClerkProvider, useAuth } from "@clerk/react";
import { createElement, type ReactNode, useCallback } from "react";

import { ENV_APP } from "@uni-stack/env/app/env";

import { appConfig } from "#/config/app";
import { type AppAuth } from "#/lib/host/types";

// The only module that imports @clerk/react. The desktop build never resolves lib/host/web, so it
// ships without Clerk even though @clerk/react declares no sideEffects flag.

export function useClerkAppAuth(): AppAuth {
  const { getToken, isLoaded, isSignedIn, signOut: clerkSignOut, userId } = useAuth();

  const signOut = useCallback(
    () => clerkSignOut({ redirectUrl: appConfig.redirectAfterSignOut }),
    [clerkSignOut]
  );

  return {
    getToken,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    signOut,
    userId: userId ?? null
  };
}

// createElement instead of JSX keeps this a .ts module, which the #/* import mapping resolves
export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  return createElement(ClerkProvider, {
    afterSignOutUrl: appConfig.redirectAfterSignOut,
    // ClerkProvider types children as a required prop, which createElement's rest argument cannot satisfy
    // oxlint-disable-next-line react/no-children-prop
    children,
    publishableKey: ENV_APP.VITE_CLERK_PUBLISHABLE_KEY
  });
}

/** The website's sign-in page, which sends the user back to `returnTo` once Clerk has a session. */
export function getWebSignInUrl(returnTo: string) {
  const url = new URL(`${appConfig.websiteUrl.replace(/\/$/, "")}/sign-in`);
  url.searchParams.set("redirect", returnTo);
  return url.toString();
}
