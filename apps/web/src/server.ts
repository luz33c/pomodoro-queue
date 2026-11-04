import {
  createStartHandler,
  defaultStreamHandler,
  handleStartError
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import { ENV_WEB_SERVER } from "@uni-stack/env/web/env.server";
import { paraglideMiddleware } from "@uni-stack/i18n/server";
import { LOG_SERVICES, createRequestLogger, initLogger } from "@uni-stack/logger/server";

initLogger({
  env: {
    environment: ENV_WEB_SERVER.NODE_ENV,
    service: LOG_SERVICES.WEB_SERVER,
    version: ENV_WEB_SERVER.SOURCE_COMMIT
  },
  sampling: {
    keep: [{ status: 400 }, { duration: 1000 }],
    rates: {
      info: 0
    }
  }
});

// The raw handler rethrows the original error, so the catch below can report it
const startHandler = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  async fetch(request, opts) {
    try {
      // Pass the original request on: a cloned one would start a separate request context
      return await paraglideMiddleware(request, () => startHandler(request, opts));
    } catch (error) {
      // Start's request middleware logs each request; this reports errors that escape Start
      const requestLog = createRequestLogger({
        method: request.method,
        path: new URL(request.url).pathname
      });
      requestLog.error(error instanceof Error ? error : new Error(String(error)));
      requestLog.emit();
      return handleStartError(error);
    }
  }
});
