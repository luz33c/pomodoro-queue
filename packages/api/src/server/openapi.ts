import { join } from "node:path/posix";

import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { experimental_RethrowHandlerPlugin as RethrowHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { appRouter } from "#/routers/index";

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

/** The Scalar API reference. apps/server creates it only when `ENABLE_OPEN_API_DOCS` is on. */
export function createDocsHandler() {
  return new OpenAPIHandler(appRouter, {
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
}
