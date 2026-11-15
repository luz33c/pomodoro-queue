import { openapi } from "@orpc/openapi";

import { HealthLiveOutputSchema } from "@uni-stack/core/health";

import { publicProcedure } from "#/orpc/procedures";
import { buildBaseHealth } from "#/routers/health/checks";

export const live = publicProcedure
  .meta(
    openapi({
      description: "Check if the server is alive",
      method: "GET",
      spec: (spec) => {
        return { ...spec, security: [] };
      }
    })
  )
  .errors({})
  .output(HealthLiveOutputSchema)
  .handler(() => {
    return { status: "healthy", ...buildBaseHealth() };
  });
