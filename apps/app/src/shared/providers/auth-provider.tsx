import { ClerkProvider } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { ENV_APP } from "@tsu-stack/env/app/env";

import { setAuthTokenGetter } from "#/shared/api/auth-token";
import { resetUserScopedCollections } from "#/shared/api/user-scoped-collections";
import { appConfig } from "#/shared/config/app";
import { useAppAuth } from "#/shared/host/auth";
import { host } from "#/shared/host/index";

/** Hands the current token getter to the API clients and drops cached private data when the user changes. */
function ApiAuthBridge() {
  const { getToken, isLoaded, userId } = useAppAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setAuthTokenGetter(getToken);

    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear();
      void resetUserScopedCollections();
    }

    previousUserId.current = userId;
  }, [isLoaded, queryClient, userId]);

  return null;
}

function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl={appConfig.redirectAfterSignOut}
      publishableKey={ENV_APP.VITE_CLERK_PUBLISHABLE_KEY}
    >
      <ApiAuthBridge />
      {children}
    </ClerkProvider>
  );
}

// Clerk is never mounted or initialized in the desktop host
function DesktopAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ApiAuthBridge />
      {children}
    </>
  );
}

export const AuthProvider = host === "desktop" ? DesktopAuthProvider : ClerkAuthProvider;
