import { Outlet, createFileRoute, redirect as routerRedirect } from "@tanstack/react-router";
import { z } from "zod";

import { redirect } from "@uni-stack/i18n/tanstack-start/lib/redirect";
import { validateNavigateTo } from "@uni-stack/i18n/tanstack-start/lib/validate-navigate-to";

import {
  getAppHomeUrl,
  getClerkAuthState,
  isAppRedirectUrl,
  toAppRedirectUrl
} from "#/features/auth/index";

import { routeTree } from "#/routeTree.gen";

const guestSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform((val) => {
      // Without a destination, authentication leads into the product
      if (!val) {
        return getAppHomeUrl();
      }

      return (
        toAppRedirectUrl(val) ??
        validateNavigateTo({
          fallbackTo: "/",
          routeTree,
          shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
          to: val
        })
      );
    })
});

export const Route = createFileRoute("/{-$locale}/(centered-layout)/(guest)")({
  validateSearch: guestSearchSchema,
  component: Outlet,
  beforeLoad: async ({ search }) => {
    const authState = await getClerkAuthState();

    // `redirect` is always an app URL or a validated site path, never undefined, thanks to the schema transform
    const redirectTo = search.redirect;

    if (authState.isAuthenticated && authState.userId) {
      if (isAppRedirectUrl(redirectTo)) {
        throw routerRedirect({ href: redirectTo });
      }

      throw redirect({
        to: redirectTo
      });
    }

    return {
      // We pass this as context so that it can be used in the sign-in/sign-up pages to redirect after successful authentication
      redirectTo
    };
  }
});
