import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const ENV_EXTENSION = createEnv({
  client: {
    WXT_CLERK_FRONTEND_API: z.url().optional(),
    WXT_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    WXT_CLERK_SYNC_HOST: z.url().optional(),
    WXT_SERVER_URL: z.url()
  },
  clientPrefix: "WXT_",
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env
});
