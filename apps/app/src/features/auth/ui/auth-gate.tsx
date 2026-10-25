import { useEffect } from "react";

import { useAppAuth } from "#/shared/host/auth";
import { host } from "#/shared/host/index";
import { getWebSignInUrl } from "#/shared/host/sign-in";
import { SpinnerScreen } from "#/shared/ui/spinner-screen";

import { DesktopSignInPlaceholder } from "./desktop-sign-in-placeholder";

/** Sign-in lives on the website; replace() keeps this page out of history so Back does not bounce. */
function RedirectToWebSignIn() {
  useEffect(() => {
    window.location.replace(getWebSignInUrl(window.location.href));
  }, []);

  return <SpinnerScreen />;
}

/** Client-side guard for every signed-in route. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAppAuth();

  if (!isLoaded) {
    return <SpinnerScreen />;
  }

  if (!isSignedIn) {
    return host === "desktop" ? <DesktopSignInPlaceholder /> : <RedirectToWebSignIn />;
  }

  return <>{children}</>;
}
