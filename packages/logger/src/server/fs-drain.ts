import { createFsDrain } from "evlog/fs";

const LOCAL_LOG_MAX_FILES = 7;

/**
 * Write server log events to local NDJSON files for development debugging and agent log analysis.
 *
 * Events land in `.evlog/logs/<date>.jsonl` under the process working directory, so
 * `pnpm run dev` in `apps/server` writes to `apps/server/.evlog/logs/`. The shared redaction
 * config runs before events reach the drain, and only the newest daily files are kept.
 *
 * Node.js only: import it from server entry points, never from modules that are also bundled
 * for the browser (such as `apps/web/src/start.ts`).
 *
 * @example
 * ```ts
 * import { initLogger } from "@tsu-stack/logger/server";
 * import { createLocalFileDrain } from "@tsu-stack/logger/server/fs-drain";
 *
 * initLogger({
 *   drain: isProduction ? undefined : createLocalFileDrain()
 * });
 * ```
 */
export function createLocalFileDrain() {
  return createFsDrain({ maxFiles: LOCAL_LOG_MAX_FILES });
}
