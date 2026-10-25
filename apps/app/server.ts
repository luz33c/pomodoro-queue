import { readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

// Only hono and Node built-ins: Node does not strip types from the @tsu-stack/* sources in node_modules
const appUrl = new URL(process.env.VITE_APP_URL ?? "http://localhost:3002/app");
const basePath = appUrl.pathname.replace(/\/+$/, "");
const indexHtml = await readFile(new URL("./dist/web/index.html", import.meta.url), "utf8");

const app = basePath ? new Hono().basePath(basePath) : new Hono();

// An empty SOURCE_COMMIT also means unknown, matching ENV_SERVER's emptyStringAsUndefined
const buildSha = process.env.SOURCE_COMMIT?.length ? process.env.SOURCE_COMMIT : "unknown";

app.get("/_health", (c) => c.json({ buildSha, status: "healthy" }));

app.on(
  ["GET", "HEAD"],
  "/*",
  serveStatic({
    root: fileURLToPath(new URL("./dist/web/", import.meta.url)),
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

// Only page paths fall back to the SPA shell; a missing file with an extension stays a 404
app.on(["GET", "HEAD"], "/*", (c) => {
  if (/\.[a-z0-9]+$/i.test(c.req.path)) {
    return c.notFound();
  }

  c.header("Cache-Control", "public, max-age=0, must-revalidate");
  return c.html(indexHtml);
});

export const server = serve({
  fetch: app.fetch,
  hostname: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? (appUrl.port || 3002))
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
