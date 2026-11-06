import { resolve } from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

import { ENV_APP } from "@uni-stack/env/app/env";

// apps/desktop/src/main/ui/view-url.ts probes the same port in the dev channel
const DESKTOP_DEV_PORT = 3003;
// Used when VITE_APP_URL has no port of its own to use; apps/web/vite.config.ts proxies its app path here
const APP_DEV_PORT = 3002;

export default defineConfig(({ mode }) => {
  const isDesktop = mode === "desktop";
  const appUrl = new URL(ENV_APP.VITE_APP_URL);
  // Mounted under the website (for example http://localhost:3000/web/app): that port belongs to web's dev server
  const isMountedUnderWeb = appUrl.origin === new URL(ENV_APP.VITE_WEB_URL).origin;
  const webPort = isMountedUnderWeb ? APP_DEV_PORT : Number(appUrl.port || APP_DEV_PORT);

  return {
    // views:// has no server-side fallback, so the desktop build uses relative asset paths
    base: isDesktop ? "./" : `${appUrl.pathname.replace(/\/$/, "")}/`,
    build: {
      emptyOutDir: true,
      outDir: isDesktop ? "dist/desktop" : "dist/web"
    },
    // Restart the dev server when env files in this directory change
    envDir: resolve(import.meta.dirname, "../../packages/env"),
    plugins: [
      // Must come before the React plugin
      tanstackRouter({
        autoCodeSplitting: true,
        generatedRouteTree: "./src/app/routeTree.gen.ts",
        routesDirectory: "./src/app/routes",
        target: "react"
      }),
      viteReact(),
      /** @see {@link https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler} */
      babel({
        presets: [reactCompilerPreset()]
      }),
      tailwindcss()
    ],
    resolve: {
      // The desktop condition points #/lib/host/runtime at lib/host/desktop (see package.json
      // imports); every other build gets lib/host/web, and neither build imports the other
      conditions: isDesktop ? [...defaultClientConditions, "desktop"] : [...defaultClientConditions]
    },
    server: {
      port: isDesktop ? DESKTOP_DEV_PORT : webPort,
      strictPort: true
    }
  };
});
