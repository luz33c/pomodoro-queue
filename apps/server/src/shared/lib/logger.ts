import { ENV_SERVER } from "@uni-stack/env/server/env";
import { LOG_SERVICES, initLogger } from "@uni-stack/logger/server";
import { createLocalFileDrain } from "@uni-stack/logger/server/fs-drain";

initLogger({
  // Development only: mirror events to apps/server/.evlog/logs/ for debugging and agent log analysis
  drain: ENV_SERVER.NODE_ENV === "production" ? undefined : createLocalFileDrain(),
  env: {
    environment: ENV_SERVER.NODE_ENV,
    service: LOG_SERVICES.SERVER,
    version: ENV_SERVER.SOURCE_COMMIT
  }
});
