import { createFileRoute } from "@tanstack/react-router";

import { m } from "@uni-stack/i18n/messages";

import { SpinnerScreen } from "#/components/spinner-screen";
import { documentTitle } from "#/lib/document-title";
import { useAppAuth } from "#/lib/host/index";

import { DesktopSignIn } from "#/features/auth/index";
import { DashboardPage } from "#/features/dashboard/index";

export const Route = createFileRoute("/(auth)/dashboard/")({
  head: () => {
    return { meta: [{ title: documentTitle(m.dashboard_page__title()) }] };
  },
  component: DashboardRoute
});

// Features never import each other, so the route composes them. Only a host that works signed out
// (desktop) reaches this signed out; the web's AuthGate has already sent the user to sign in.
function DashboardRoute() {
  const { isLoaded, isSignedIn } = useAppAuth();

  if (!isLoaded) {
    return <SpinnerScreen />;
  }

  return isSignedIn ? <DashboardPage /> : <DesktopSignIn />;
}
