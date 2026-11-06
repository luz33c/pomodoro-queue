import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { Toaster } from "@uni-stack/ui/components/sonner";
import { ThemeProvider } from "@uni-stack/ui/components/theme-switcher";

import { DefaultErrorPage } from "#/components/errors/default-error-page";
import { queryClient } from "#/lib/api-client/query-client";
import { documentTitle } from "#/lib/document-title";

import { AuthProvider } from "#/app/providers/auth-provider";
import { LoggerProvider } from "#/app/providers/logger-provider";

// Root route context shared by every route, injected in router.ts
type RouterAppContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => {
    return { meta: [{ title: documentTitle() }] };
  },
  errorComponent: DefaultErrorPage,
  component: RootComponent
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* index.html has no <title>; the routes' head() options own it */}
      <HeadContent />
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AuthProvider>
          <LoggerProvider>
            <Outlet />
            <Toaster richColors />
          </LoggerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
