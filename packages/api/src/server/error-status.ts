import { COMMON_ERROR_STATUS_MAP } from "@orpc/server";

import { TODO_ERROR_STATUS } from "#/routers/todo/errors";

/**
 * HTTP status per error code for the RPC handler, the OpenAPI handler, and the generated spec.
 * A code missing here is sent as 400.
 */
export const errorStatusMap = {
  ...COMMON_ERROR_STATUS_MAP,
  ...TODO_ERROR_STATUS
};
