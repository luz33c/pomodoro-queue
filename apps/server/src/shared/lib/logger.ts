import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { LOG_SERVICES, initLogger } from "@tsu-stack/logger/server";
import { createLocalFileDrain } from "@tsu-stack/logger/server/fs-drain";

initLogger({
  // Development only: mirror events to apps/server/.evlog/logs/ for debugging and agent log analysis
  drain: ENV_SERVER.NODE_ENV === "production" ? undefined : createLocalFileDrain(),
  env: {
    environment: ENV_SERVER.NODE_ENV,
    service: LOG_SERVICES.SERVER,
    version: ENV_SERVER.SOURCE_COMMIT
  }
});
