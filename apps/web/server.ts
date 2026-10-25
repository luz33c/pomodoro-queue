import { readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const { default: handler } = (await import(
  new URL("./dist/server/server.js", import.meta.url).href
)) as {
  default: { fetch: (request: Request) => Response | Promise<Response> };
};

const webUrl = new URL(process.env.VITE_WEB_URL ?? "http://localhost:3000/web");
const basePath = webUrl.pathname.replace(/\/+$/, "");
const app = new Hono().basePath(basePath);

// When VITE_APP_URL points under this site (for example https://example.com/app), this launcher also
// serves the product app's static build there; otherwise apps/app runs as its own service.
const appUrl = new URL(process.env.VITE_APP_URL ?? "http://localhost:3002/app");
const appBasePath = appUrl.pathname.replace(/\/+$/, "");

if (appUrl.origin === webUrl.origin && appBasePath.startsWith(`${basePath}/`)) {
  const appRoute = `${appBasePath.slice(basePath.length)}/*`;
  // Resolves to node_modules/@tsu-stack/app in the production image and to apps/app locally.
  const appDistUrl = new URL("./dist/web/", import.meta.resolve("@tsu-stack/app/package.json"));
  const appDist = fileURLToPath(appDistUrl);
  const appIndexHtml = await readFile(new URL("index.html", appDistUrl), "utf8");

  app.on(
    ["GET", "HEAD"],
    appRoute,
    serveStatic({
      root: appDist,
      rewriteRequestPath: (path) => path.slice(appBasePath.length) || "/",
      onFound: (_path, c) => {
        c.header(
          "Cache-Control",
          c.req.path.startsWith(`${appBasePath}/assets/`)
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate"
        );
      }
    })
  );

  // Page paths fall back to the app shell; a missing file with an extension stays a 404 instead of reaching Start
  app.on(["GET", "HEAD"], appRoute, (c) => {
    if (/\.[a-z0-9]+$/i.test(c.req.path)) {
      return c.notFound();
    }

    c.header("Cache-Control", "public, max-age=0, must-revalidate");
    return c.html(appIndexHtml);
  });
}

app.on(
  ["GET", "HEAD"],
  "/*",
  serveStatic({
    root: fileURLToPath(new URL("./dist/client/", import.meta.url)),
    rewriteRequestPath: (path) => path.slice(basePath.length) || "/",
    onFound: (_path, c) => {
      c.header(
        "Cache-Control",
        c.req.path.startsWith(`${basePath}/assets/`)
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate"
      );
    }
  })
);

app.all("/*", (c) => handler.fetch(c.req.raw));

export const server = serve({
  fetch: app.fetch,
  hostname: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? (webUrl.port || 3000))
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
