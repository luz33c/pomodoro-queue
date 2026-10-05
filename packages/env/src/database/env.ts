import process from "node:process";

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const ENV_DATABASE = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    DATABASE_URL: z.string().min(1)
  }
});
