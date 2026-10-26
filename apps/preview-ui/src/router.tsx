import { createRouter } from "@tanstack/react-router";

import { routeTree } from "#/routeTree.gen";

export function getRouter() {
  return createRouter({
    // Prefetch <Link> on hover and touch
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true
  });
}

declare module "@tanstack/react-router" {
  // Module augmentation has to merge into the library's interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
