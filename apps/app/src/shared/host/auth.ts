import { useAuth } from "@clerk/react";
import { useCallback } from "react";

import { appConfig } from "#/shared/config/app";
import { host } from "#/shared/host/index";

export type AppAuth = {
  getToken: () => Promise<string | null>;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  userId: string | null;
};

function useClerkAppAuth(): AppAuth {
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

const getNoToken = async () => null;
const signOutNoop = async () => {};

// Desktop sign-in is not wired yet; the desktop host always reports a signed-out user.
function useDesktopAuth(): AppAuth {
  return {
    getToken: getNoToken,
    isLoaded: true,
    isSignedIn: false,
    signOut: signOutNoop,
    userId: null
  };
}

/** The only auth hook pages and providers use. The host picks the implementation once, so hook order never changes. */
export const useAppAuth = host === "desktop" ? useDesktopAuth : useClerkAppAuth;
