import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/tanstack-react-start";
import geistMonoCyrillic from "@fontsource-variable/geist-mono/files/geist-mono-cyrillic-wght-normal.woff2?url";
import geistMonoLatinExt from "@fontsource-variable/geist-mono/files/geist-mono-latin-ext-wght-normal.woff2?url";
import geistMonoLatin from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import geistVariableCyrillic from "@fontsource-variable/geist/files/geist-cyrillic-wght-normal.woff2?url";
import geistVariableLatinExt from "@fontsource-variable/geist/files/geist-latin-ext-wght-normal.woff2?url";
import geistVariableLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import instrumentSerifLatin400 from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";
import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import { setClerkAuthTokenGetter } from "@tsu-stack/api/client/tanstack-start/clerk-auth";
import { resolvePublicAssetUrl } from "@tsu-stack/core/assets";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { getLocale } from "@tsu-stack/i18n/runtime";
import { Toaster } from "@tsu-stack/ui/components/sonner";

import { generateAppSeo } from "@/shared/lib/seo";
import { LoggerProvider } from "@/shared/providers/logger-provider";
import { ProgressProvider } from "@/shared/providers/progress.provider";
import appCss from "@/shared/styles/app.css?url";
import { ThemeProvider } from "@/shared/ui/theme-switcher";

import { DefaultErrorPage } from "@/pages/default-error";

// Root route with shared context for the entire app, inject them in router.tsx
type RouterAppContext = {
  queryClient: QueryClient;
};

function ClerkApiAuthBridge() {
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  errorComponent: DefaultErrorPage,
  shellComponent: RootDocument,
  head: () => {
    const rootSeo = generateAppSeo({
      includeDocumentMeta: true
    });
    const faviconHref = resolvePublicAssetUrl(ENV_WEB_ISOMORPHIC.VITE_WEB_URL, "/favicon.ico");
    const sitemapHref = resolvePublicAssetUrl(ENV_WEB_ISOMORPHIC.VITE_WEB_URL, "/sitemap.xml");

    return {
      links: [
        ...(rootSeo.links ?? []),
        {
          href: faviconHref,
          rel: "icon"
        },
        {
          href: sitemapHref,
          rel: "sitemap",
          type: "application/xml"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: instrumentSerifLatin400,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistVariableLatin,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistVariableLatinExt,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistVariableCyrillic,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistMonoLatin,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistMonoLatinExt,
          crossOrigin: "anonymous"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: geistMonoCyrillic,
          crossOrigin: "anonymous"
        },
        { href: appCss, rel: "stylesheet" }
      ],
      meta: [...(rootSeo.meta ?? [])]
    };
  }
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider publishableKey={ENV_WEB_ISOMORPHIC.VITE_CLERK_PUBLISHABLE_KEY}>
          <ClerkApiAuthBridge />
          <LoggerProvider>
            {/* We place the progress provider here otherwise we will get "Cannot render a <style> outside the main document" error */}
            <ThemeProvider attribute="class" defaultTheme="dark">
              <ProgressProvider>
                {children}
                <Toaster richColors />
                <TanStackDevtools
                  plugins={[
                    {
                      name: "TanStack Query",
                      render: <ReactQueryDevtoolsPanel />
                    },
                    {
                      name: "TanStack Router",
                      render: <TanStackRouterDevtoolsPanel />
                    },
                    formDevtoolsPlugin(),
                    a11yDevtoolsPlugin()
                  ]}
                />
                <Scripts />
              </ProgressProvider>
            </ThemeProvider>
          </LoggerProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
