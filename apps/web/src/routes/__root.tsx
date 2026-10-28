import { zhCN } from "@clerk/localizations";
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
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Fragment, useEffect, useRef } from "react";

import { setClerkAuthTokenGetter } from "@tsu-stack/api/client/tanstack-start/clerk-auth";
import { resolvePublicAssetUrl } from "@tsu-stack/core/assets";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { type Locale } from "@tsu-stack/i18n/runtime";
import {
  LocaleProvider,
  useLocale
} from "@tsu-stack/i18n/tanstack-start/components/locale-provider";
import { Toaster } from "@tsu-stack/ui/components/sonner";
import { ThemeProvider } from "@tsu-stack/ui/components/theme-switcher";

import { getAppOrigin } from "#/shared/lib/app-url";
import { generateAppSeo } from "#/shared/lib/seo";
import { LoggerProvider } from "#/shared/providers/logger-provider";
import { ProgressProvider } from "#/shared/providers/progress.provider";
import appCss from "#/shared/styles/app.css?url";

import { DefaultErrorPage } from "#/pages/default-error/index";

// Copy for Clerk's prebuilt sign-in and sign-up cards; a locale without an entry gets Clerk's English
const CLERK_LOCALIZATIONS: Partial<Record<Locale, typeof zhCN>> = { zh: zhCN };

// Root route with shared context for the entire app, inject them in router.tsx
type RouterAppContext = {
  queryClient: QueryClient;
};

function ClerkApiAuthBridge() {
  const { getToken, isLoaded, userId } = useClerkAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const nextUserId = userId ?? null;

    if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
      queryClient.clear();
    }

    previousUserId.current = nextUserId;
  }, [isLoaded, queryClient, userId]);

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
    <LocaleProvider>
      <RootDocumentInner>{children}</RootDocumentInner>
    </LocaleProvider>
  );
}

function RootDocumentInner({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();

  return (
    <html suppressHydrationWarning lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Without the app origin, Clerk treats the post-sign-in redirect into apps/app as unsafe and falls back */}
        <ClerkProvider
          allowedRedirectOrigins={[getAppOrigin()]}
          localization={CLERK_LOCALIZATIONS[locale]}
          publishableKey={ENV_WEB_ISOMORPHIC.VITE_CLERK_PUBLISHABLE_KEY}
        >
          <ClerkApiAuthBridge />
          <LoggerProvider>
            {/* We place the progress provider here otherwise we will get "Cannot render a <style> outside the main document" error */}
            <ThemeProvider attribute="class" defaultTheme="dark">
              <ProgressProvider>
                <Fragment key={locale}>{children}</Fragment>
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
