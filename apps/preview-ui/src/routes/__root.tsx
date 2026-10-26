import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { ThemeProvider } from "@tsu-stack/ui/components/theme-switcher";

import appCss from "#/shared/styles/app.css?url";

import { NotFoundPage } from "#/pages/not-found/index";

export const Route = createRootRoute({
  head: () => {
    return {
      links: [
        { href: appCss, rel: "stylesheet" },
        { href: "/favicon.ico", rel: "icon" }
      ],
      meta: [
        { charSet: "utf-8" },
        { content: "width=device-width, initial-scale=1", name: "viewport" },
        { content: "noindex, nofollow", name: "robots" },
        { title: "tsu-stack UI" }
      ]
    };
  },
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration
    <html suppressHydrationWarning lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
