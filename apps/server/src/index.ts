import { hostname } from "node:os";
import { join } from "node:path/posix";

import { serve } from "@hono/node-server";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { experimental_RethrowHandlerPlugin as RethrowHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type ContentfulStatusCode } from "hono/utils/http-status";

import { getClerkAuthorizedParties } from "@tsu-stack/api/lib/auth/clerk-authorized-parties";
import {
  authenticateClerkRequest,
  createContext
} from "@tsu-stack/api/lib/context/hono/create-context";
import { ELECTRIC_EXPOSED_HEADERS, proxyShape } from "@tsu-stack/api/lib/electric/shape-proxy";
import { resolveShape } from "@tsu-stack/api/lib/electric/shapes";
import { appRouter } from "@tsu-stack/api/routers/index";
import { migrateDatabase } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { log, parseError } from "@tsu-stack/logger/server";
import {
  honoLogIngestionMiddleware,
  honoLoggerMiddleware,
  type HonoLogVariables
} from "@tsu-stack/logger/server/hono/middleware";

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
    // The Electric client reads its sync position from these response headers
    exposeHeaders: ELECTRIC_EXPOSED_HEADERS,
    origin: getClerkAuthorizedParties()
  })
);

app.use(
  "/*",
  honoLoggerMiddleware({
    // Shape requests are long polls that every open client repeats
    exclude: ["**/health/**", "**/_logs/ingest", "**/shape/**"],
    enrich: (ctx) => {
      ctx.event.hostname = serverHostname;
    }
  })
);

app.post("/_logs/ingest", honoLogIngestionMiddleware());

// Registered before the oRPC fallback below, so shape polls never build an oRPC context
app.get("/shape/:name/:version", async (c) => {
  const auth = await authenticateClerkRequest(c.req.raw);
  if (!auth) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const shape = resolveShape(c.req.param("name"), c.req.param("version"));
  if (!shape) {
    return c.json({ message: "Unknown shape" }, 404);
  }

  // Each user gets different rows; cors() already set Vary: Origin on the context
  c.header("Vary", "Authorization", { append: true });
  return proxyShape(c.req.raw, shape, auth.userId);
});

// The API reference is opt-in: without the flag, /docs is an unmatched path like any other
if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
  const docsHandler = new OpenAPIHandler(appRouter, {
    plugins: [
      new OpenAPIReferencePlugin({
        docsConfig: () => {
          const apiBasePath = new URL(ENV_SERVER.VITE_SERVER_URL).pathname;
          return {
            content: undefined,
            metaData: {
              description: "Documentation for the @tsu-stack/server API.",
              title: "@tsu-stack/server API Documentation"
            },
            sources: [
              {
                title: "API Reference",
                url: join(apiBasePath, "docs", "spec.json")
              }
            ],
            theme: "deepSpace"
          };
        },
        docsPath: "/",
        schemaConverters: [new ZodToJsonSchemaConverter()],
        specGenerateOptions: {
          components: {
            securitySchemes: {
              clerkBearer: {
                bearerFormat: "JWT",
                description: "Clerk session token passed as a Bearer token.",
                scheme: "bearer",
                type: "http"
              }
            }
          },
          info: {
            description: `This is the API for @tsu-stack/server.\n## Usage\nProtected endpoints require a Clerk session token in the \`Authorization: Bearer <token>\` header.\n## Resources\n - [Official Website](${ENV_SERVER.VITE_WEB_URL})`,
            title: "@tsu-stack/server API",
            version: ENV_SERVER.SOURCE_COMMIT
          },
          servers: [
            {
              description: "Primary API Server",
              url: ENV_SERVER.VITE_SERVER_URL
            }
          ]
        },
        specPath: "/spec.json"
      })
    ]
  });

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

export const openApiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "openapi" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()]
    }),
    new RethrowHandlerPlugin({
      filter: (error) => !(error instanceof ORPCError)
    })
  ]
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "rpc" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: []
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c, logger: c.get("log") });

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
