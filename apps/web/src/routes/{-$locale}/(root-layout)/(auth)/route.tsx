import { useAuth as useClerkAuth } from "@clerk/tanstack-react-start";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { useLocation } from "@tsu-stack/i18n/tanstack-start/hooks/use-location";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { getRouteTreePathsLocalized } from "@tsu-stack/i18n/tanstack-start/lib/get-route-tree-paths-localized";
import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";

import { useLogger } from "#/shared/providers/logger-provider";

import { getClerkAuthState } from "#/features/auth/index";

import { routeTree } from "#/routeTree.gen";

/**
 * Checks if a given pathname is a guest route (sign-in, create-an-account, etc.)
 * We add this because the useEffect may run after the beforeLoad redirect when navigating to a (guest) route
 * which would cause the redirect param to be set to the default since it performs a brand new navigation in /sign-in
 */
function isGuestRoute(pathname: string): boolean {
  const routes = getRouteTreePathsLocalized(routeTree);
  const matchingRoute = routes.find((route) => route.path === pathname);
  return matchingRoute ? matchingRoute.id.includes("(guest)") : false;
}

export const Route = createFileRoute("/{-$locale}/(root-layout)/(auth)")({
  beforeLoad: async ({ location }) => {
    const authState = await getClerkAuthState();

    if (!authState.isAuthenticated || !authState.userId) {
      const currentHref = stripLocalePrefix(location.href);
      const redirectTo = validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: currentHref
      });

      throw redirect({
        search: {
          redirect: redirectTo
        },
        to: "/sign-in"
      });
    }

    return {
      auth: {
        userId: authState.userId
      }
    };
  },
  component: RequiresAuthLayout
});

function RequiresAuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const logger = useLogger();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      if (isGuestRoute(location.pathname)) {
        return;
      }

      const redirectTo = validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: stripLocalePrefix(location.href)
      });

      void navigate({
        search: {
          redirect: redirectTo
        },
        to: "/sign-in"
      });
    }
  }, [isLoaded, isSignedIn, navigate, location.href, location.pathname, logger]);

  return <Outlet />;
}
