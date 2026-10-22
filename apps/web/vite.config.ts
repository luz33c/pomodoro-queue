import { resolve } from "node:path";

import { ohImage } from "@lonik/oh-image/plugin";
import mdx from "@mdx-js/rollup";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";
import { locales } from "@tsu-stack/i18n/runtime";
import { paraglideVitePlugin } from "@tsu-stack/i18n/vite/plugin";

import { type FileRouteTypes } from "#/routeTree.gen";

/**
 * IMPORTANT: We define this explicitly here instead of crawling from the root (/) because
 * crawling can sometimes miss i18n routes that are not directly linked from the root.
 * We type it as FileRouteTypes['fullPaths'][] since prerender needs to have the `/` suffix or else we will get `Error: redirect count exceeded` on build.
 */
const ROUTES_TO_PRERENDER: FileRouteTypes["fullPaths"][] = [
  "/{-$locale}/",
  "/{-$locale}/playground/",
  "/{-$locale}/privacy-policy/",
  "/sitemap.xml",
  "/robots.txt"
];

const PAGES_PRERENDER_CONFIG = [
  // Also prerender the default locale without the locale prefix
  ...ROUTES_TO_PRERENDER.map((path) => {
    return {
      path: path.replace("{-$locale}/", ""),
      prerender: { enabled: true }
    };
  }),
  // Prerender all locales with their locale prefix (including base locale since the prefix is removed on the client via router)
  ...locales.flatMap((loc) =>
    ROUTES_TO_PRERENDER.map((path) => {
      return {
        path: path.replace("{-$locale}", loc),
        prerender: { enabled: true }
      };
    })
  )
];

function getPortFromUrl(url: string, fallback: number): number {
  const port = new URL(url).port;
  return port ? Number(port) : fallback;
}

export default defineConfig({
  /**
   * FIXME: This is needed for prerendering to work in Docker Compose builds
   * @see {@link https://github.com/TanStack/router/issues/6275}
   */
  preview: {
    host: "127.0.0.1"
  },
  base: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname,
  // Restart the dev server when env files in this directory change
  envDir: resolve(import.meta.dirname, "../../packages/env"),
  resolve: {
    tsconfigPaths: true
  },
  define: {
    __BUILD_NODE_ENV__: JSON.stringify(ENV_WEB_SERVER.NODE_ENV),
    __BUILD_SOURCE_COMMIT__: JSON.stringify(ENV_WEB_SERVER.SOURCE_COMMIT)
  },
  server: {
    port: getPortFromUrl(ENV_WEB_ISOMORPHIC.VITE_WEB_URL, 3000)
  },
  plugins: [
    devtools({
      consolePiping: { enabled: false }
    }),
    mdx(),
    tanstackStart({
      pages: PAGES_PRERENDER_CONFIG,
      prerender: {
        enabled: true,
        // Only prerender paths defined in the PAGES_PRERENDER_CONFIG object
        autoStaticPathsDiscovery: false,
        // Disable crawling to avoid missing i18n routes, we are explicitly defining them in PAGES_PRERENDER_CONFIG
        crawlLinks: false
      },
      server: {
        build: {
          // Don't allow changing of process.env.NODE_ENV at runtime
          staticNodeEnv: true
        }
      }
    }),
    viteReact(),
    /** @see {@link https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler} */
    babel({
      presets: [reactCompilerPreset()]
    }),
    paraglideVitePlugin({
      basePath: new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).pathname
    }),
    tailwindcss(),
    ohImage({
      pl_show: true,
      transforms: {
        format: "webp",
        quality: 80
      }
    })
  ]
});
