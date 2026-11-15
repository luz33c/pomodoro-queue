import { pgClient } from "@uni-stack/db";
import { type RequestLogger } from "@uni-stack/logger/server";

import { PostgresPublisher } from "#/orpc/postgres-publisher";

export type TodoChange = { at: string };

// Fan-out keyed by owner, relayed through Postgres LISTEN/NOTIFY so a write on any server instance
// reaches streams held by every instance. The channel is set explicitly rather than relying on the
// adapter's default, which upstream review may still change.
const publisher = new PostgresPublisher<Record<string, TodoChange>>(pgClient, {
  channel: "todo_changes"
});

/**
 * Tells every open `todo.changes` stream of this owner to refetch. Call after the write commits.
 * The write already succeeded, so a failed signal is logged instead of thrown.
 */
export async function publishTodoChange(ownerId: string, logger: RequestLogger) {
  try {
    await publisher.publish(ownerId, { at: new Date().toISOString() });
  } catch (error) {
    logger.warn("Todo change signal was not sent", {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}

/** Yields one change per write by this owner until the signal aborts. */
export function subscribeTodoChanges(ownerId: string, signal?: AbortSignal) {
  return publisher.subscribe(ownerId, { signal });
}
