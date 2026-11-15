import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { RethrowHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod";

import { ENV_SERVER } from "@uni-stack/env/server/env";

import { appRouter } from "#/routers/index";
import { errorStatusMap } from "#/server/error-status";

const converters = [new ZodToJsonSchemaConverter()];

export const openApiHandler = new OpenAPIHandler(appRouter, {
  errorStatusMap,
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "openapi" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: [
    new SmartCoercionHandlerPlugin({ converters }),
    new RethrowHandlerPlugin({
      filter: (error) => !(error instanceof ORPCError)
    })
  ]
});

/** The Scalar API reference. apps/server creates it only when `ENABLE_OPEN_API_DOCS` is on. */
export function createDocsHandler() {
  const generator = new OpenAPIGenerator({ converters });

  return new OpenAPIHandler(appRouter, {
    plugins: [
      new OpenAPIReferenceHandlerPlugin({
        docsPath: "/",
        docsTitle: "@uni-stack/server API Documentation",
        providerConfig: { theme: "deepSpace" },
        spec: () =>
          generator.generate(appRouter, {
            base: {
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
                description: `This is the API for @uni-stack/server.\n## Usage\nProtected endpoints require a Clerk session token in the \`Authorization: Bearer <token>\` header.\n## Resources\n - [Official Website](${ENV_SERVER.VITE_WEB_URL})`,
                title: "@uni-stack/server API",
                version: ENV_SERVER.SOURCE_COMMIT
              },
              servers: [
                {
                  description: "Primary API Server",
                  url: ENV_SERVER.VITE_SERVER_URL
                }
              ]
            },
            errorStatusMap,
            // 1.x wrote OpenAPI 3.1.1; 2.0 defaults to 3.2.0
            version: "3.1.1"
          }),
        specPath: "/spec.json"
      })
    ]
  });
}
