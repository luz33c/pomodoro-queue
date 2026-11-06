import { createRouter } from "@tanstack/react-router";

import { ENV_APP } from "@uni-stack/env/app/env";
import { LOG_SERVICES, initLog } from "@uni-stack/logger/client";

import { DefaultNotFoundPage } from "#/components/errors/not-found-page";
import { queryClient } from "#/lib/api-client/query-client";
import { hostAdapter } from "#/lib/host/index";

import { routeTree } from "#/app/routeTree.gen";

initLog({
  batchedTransport: {
    drain: {
      endpoint: `${ENV_APP.VITE_SERVER_URL.replace(/\/$/, "")}/_logs/ingest`
    },
    pipeline: {
      batch: {
        intervalMs: 2000,
        size: 25
      },
      retry: {
        maxAttempts: 3
      }
    }
  },
  console: false,
  service: LOG_SERVICES.APP_CLIENT
});

export const router = createRouter({
  basepath: hostAdapter.router.basepath,
  context: { queryClient },
  defaultNotFoundComponent: DefaultNotFoundPage,
  // Prefetch <Link> on hover and touch
  defaultPreload: "intent",
  // Let TanStack Query own data caching; route loaders rerun on every navigation
  defaultPreloadStaleTime: 0,
  history: hostAdapter.router.createHistory(),
  routeTree,
  scrollRestoration: true
});

declare module "@tanstack/react-router" {
  // Module augmentation has to merge into the library's interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}
