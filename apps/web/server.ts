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
