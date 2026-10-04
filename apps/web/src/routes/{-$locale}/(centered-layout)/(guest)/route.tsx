import { Outlet, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { redirect } from "@tsu-stack/i18n/tanstack-start/lib/redirect";
import { validateNavigateTo } from "@tsu-stack/i18n/tanstack-start/lib/validate-navigate-to";

import { getClerkAuthState } from "@/features/auth";

import { routeTree } from "@/routeTree.gen";

const guestSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform((val) =>
      validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: val
      })
    )
});

export const Route = createFileRoute("/{-$locale}/(centered-layout)/(guest)")({
  validateSearch: guestSearchSchema,
  component: Outlet,
  beforeLoad: async ({ search }) => {
    const authState = await getClerkAuthState();

    // `redirect` is always NavigateTo (never undefined) thanks to schema transform & i18n path validation util
    const redirectTo = search.redirect;

    if (authState.isAuthenticated && authState.userId) {
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
