import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

export const ENV_APP = createEnv({
  client: {
    VITE_APP_URL: isProduction ? z.url() : z.url().default("http://localhost:3002/app"),
    // Client ID of the public Clerk OAuth application the desktop build signs in with; unset disables desktop sign-in.
    VITE_CLERK_DESKTOP_CLIENT_ID: z.string().min(1).optional(),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_SERVER_URL: isProduction ? z.url() : z.url().default("http://localhost:5000/server"),
    VITE_WEB_URL: isProduction ? z.url() : z.url().default("http://localhost:3000/web")
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env ?? process.env
});
