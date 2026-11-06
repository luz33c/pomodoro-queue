import { EventPublisher } from "@orpc/server";

export type TodoChange = { at: string };

// In-process fan-out keyed by owner. One server instance today; with more, relay through Postgres
// LISTEN/NOTIFY here so a write on one instance reaches streams held by the others.
const publisher = new EventPublisher<Record<string, TodoChange>>();

/** Tells every open `todo.changes` stream of this owner to refetch. Call after the write commits. */
export function publishTodoChange(ownerId: string) {
  publisher.publish(ownerId, { at: new Date().toISOString() });
}

/** Yields one change per write by this owner until the signal aborts. */
export function subscribeTodoChanges(ownerId: string, signal?: AbortSignal) {
  return publisher.subscribe(ownerId, { signal });
}
