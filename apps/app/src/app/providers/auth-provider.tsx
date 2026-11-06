import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { setAuthTokenGetter } from "#/lib/api-client/auth-token";
import { hostAdapter, useAppAuth } from "#/lib/host/index";
import { resetUserScopedCollections } from "#/lib/sync/user-scoped-collections";

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

// Clerk on the web; on desktop the session lives in the shell's main process and needs no provider
const HostAuthProvider = hostAdapter.auth.Provider;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <HostAuthProvider>
      <ApiAuthBridge />
      {children}
    </HostAuthProvider>
  );
}
