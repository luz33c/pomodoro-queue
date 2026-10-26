import { useEffect } from "react";

import { useAppAuth } from "#/shared/host/auth";
import { dataMode } from "#/shared/host/persistence";
import { getWebSignInUrl } from "#/shared/host/sign-in";
import { SpinnerScreen } from "#/shared/ui/spinner-screen";

/** Sign-in lives on the website; replace() keeps this page out of history so Back does not bounce. */
function RedirectToWebSignIn() {
  useEffect(() => {
    window.location.replace(getWebSignInUrl(window.location.href));
  }, []);

  return <SpinnerScreen />;
}

/**
 * Client-side guard for every route in the app shell. Cloud data needs a signed-in user;
 * local data needs no account, so pages that call private APIs check sign-in themselves.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAppAuth();

  if (dataMode === "local") {
    return <>{children}</>;
  }

  if (!isLoaded) {
    return <SpinnerScreen />;
  }

  if (!isSignedIn) {
    return <RedirectToWebSignIn />;
  }

  return <>{children}</>;
}
