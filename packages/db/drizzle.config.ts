import { type Config } from "drizzle-kit";

import { ENV_DATABASE } from "@uni-stack/env/database/env";

export default {
  breakpoints: true,
  introspect: {
    casing: "preserve"
  },
  dbCredentials: {
    url: ENV_DATABASE.DATABASE_URL
  },
  dialect: "postgresql",
  out: "./migrations",
  schema: "./src/schema/index.ts",

  verbose: true
} satisfies Config;
