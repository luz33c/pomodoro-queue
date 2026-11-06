import { useEffect } from "react";

import { SpinnerScreen } from "#/components/spinner-screen";
import { hostAdapter, useAppAuth } from "#/lib/host/index";

const { signInRedirect } = hostAdapter.auth;

/** Sign-in lives on the website; replace() keeps this page out of history so Back does not bounce. */
function RedirectToSignIn({ signInUrl }: { signInUrl: (returnTo: string) => string }) {
  useEffect(() => {
    window.location.replace(signInUrl(window.location.href));
  }, [signInUrl]);

  return <SpinnerScreen />;
}

/**
 * Client-side guard for every route in the app shell. A host that sends users to the website to sign
 * in needs a signed-in user; a host that works signed out (desktop, on device rows) lets everyone in,
 * so pages that call private APIs check sign-in themselves.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAppAuth();

  if (!signInRedirect) {
    return <>{children}</>;
  }

  if (!isLoaded) {
    return <SpinnerScreen />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn signInUrl={signInRedirect} />;
  }

  return <>{children}</>;
}
