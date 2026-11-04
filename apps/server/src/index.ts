import { hostname } from "node:os";
import { join } from "node:path/posix";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type ContentfulStatusCode } from "hono/utils/http-status";

import { getClerkAuthorizedParties } from "@uni-stack/api/server/clerk";
import { createContext } from "@uni-stack/api/server/create-context";
import { createDocsHandler, openApiHandler } from "@uni-stack/api/server/openapi";
import { rpcHandler } from "@uni-stack/api/server/rpc";
import { migrateDatabase } from "@uni-stack/db";
import { ENV_SERVER } from "@uni-stack/env/server/env";
import { log, parseError } from "@uni-stack/logger/server";
import {
  honoLogIngestionMiddleware,
  honoLoggerMiddleware,
  type HonoLogVariables
} from "@uni-stack/logger/server/hono/middleware";

import "#/shared/lib/logger";

const serverHostname = hostname();

export const app = new Hono<HonoLogVariables>().basePath(
  new URL(ENV_SERVER.VITE_SERVER_URL).pathname
);

app.use(
  "/*",
  cors({
    // The browser log drain (evlog/http) sends X-Evlog-Source when posting to /_logs/ingest
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Evlog-Source"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    origin: getClerkAuthorizedParties()
  })
);

app.use(
  "/*",
  honoLoggerMiddleware({
    exclude: ["**/health/**", "**/_logs/ingest"],
    enrich: (ctx) => {
      ctx.event.hostname = serverHostname;
    }
  })
);

app.post("/_logs/ingest", honoLogIngestionMiddleware());

// The API reference is opt-in: without the flag, /docs is an unmatched path like any other
if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
  const docsHandler = createDocsHandler();

  // Only these two paths reach the docs handler, so it never serves procedures under /docs
  app.on("GET", ["/docs", "/docs/spec.json"], async (c) => {
    const result = await docsHandler.handle(c.req.raw, {
      context: { auth: null, logger: c.get("log") },
      prefix: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "docs") as `/${string}`
    });

    return result.matched ? c.newResponse(result.response.body, result.response) : c.notFound();
  });
}

app.onError((error, c) => {
  const requestLog = c.get("log");
  if (requestLog) {
    requestLog.error(error);
  } else {
    log.error({ event: "hono_global_error", error });
  }

  const parsed = parseError(error);

  // An unexpected failure's message can carry SQL, bound parameters, or internal hostnames
  if (parsed.status >= 500) {
    return c.json({ message: "Internal server error" }, parsed.status as ContentfulStatusCode);
  }

  return c.json(
    {
      message: parsed.message,
      ...(parsed.code ? { code: parsed.code } : {}),
      ...(parsed.why ? { why: parsed.why } : {}),
      ...(parsed.fix ? { fix: parsed.fix } : {}),
      ...(parsed.link ? { link: parsed.link } : {})
    },
    parsed.status as ContentfulStatusCode
  );
});

app.use("/*", async (c, next) => {
  const context = await createContext({ logger: c.get("log"), request: c.req.raw });

  // oRPC at /rpc/*
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context,
    prefix: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "rpc") as `/${string}`
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  // OpenAPI REST API at /*
  const openApiResult = await openApiHandler.handle(c.req.raw, {
    context,
    prefix: new URL(ENV_SERVER.VITE_SERVER_URL).pathname as `/${string}`
  });

  if (openApiResult.matched) {
    return c.newResponse(openApiResult.response.body, openApiResult.response);
  }

  await next();
});

void (async () => {
  await migrateDatabase();

  const serverUrl = new URL(ENV_SERVER.VITE_SERVER_URL);
  const serverPort = serverUrl.port ? Number(serverUrl.port) : 5000;

  serve(
    {
      fetch: app.fetch,
      port: serverPort
    },
    (info) => {
      log.info("server", `Server is running on http://localhost:${info.port}${serverUrl.pathname}`);
    }
  );
})();
