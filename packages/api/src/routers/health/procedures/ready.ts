import { z } from "zod";

import { HealthChecksSchema, HealthReadyOutputSchema } from "@tsu-stack/core/health";

import { publicProcedure } from "#/orpc/procedures";
import { buildBaseHealth, runServiceChecks } from "#/routers/health/checks";

export const ready = publicProcedure
  .route({
    description: "Check if the server is ready to handle requests and connect to external services",
    method: "GET",
    spec: (spec) => {
      return { ...spec, security: [] };
    }
  })
  .errors({
    SERVICE_UNAVAILABLE: {
      data: z.object({
        checks: HealthChecksSchema
      }),
      description: "One or more services are unhealthy",
      status: 503
    }
  })
  .output(HealthReadyOutputSchema)
  .handler(async ({ errors }) => {
    const checks = await runServiceChecks();
    const allHealthy = Object.values(checks).every((r) => r.status === "healthy");

    if (!allHealthy) {
      throw errors.SERVICE_UNAVAILABLE({ data: { checks } });
    }

    return {
      status: "healthy" as const,
      ...buildBaseHealth(),
      checks
    };
  });
