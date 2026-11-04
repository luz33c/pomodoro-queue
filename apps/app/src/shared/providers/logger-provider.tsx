import { useEffect } from "react";

import { clearIdentity, setIdentity } from "@uni-stack/logger/client";

import { useAppAuth } from "#/shared/host/auth";

/** Tags browser log events with the signed-in user. */
export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAppAuth();

  useEffect(() => {
    setIdentity({ user: { id: isLoaded && isSignedIn && userId ? userId : "anonymous" } });

    return () => {
      clearIdentity();
    };
  }, [isLoaded, isSignedIn, userId]);

  return <>{children}</>;
}
