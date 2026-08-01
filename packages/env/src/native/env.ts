import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const ENV_NATIVE = createEnv({
  client: {
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    EXPO_PUBLIC_SERVER_URL: z.url()
  },
  clientPrefix: "EXPO_PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: process.env
});
