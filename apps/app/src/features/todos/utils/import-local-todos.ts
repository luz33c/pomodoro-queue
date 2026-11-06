import { type TodoCollection } from "#/features/todos/api/todo-source";

/**
 * Moves this device's todos into the signed-in account, oldest first so they keep their order.
 * Each row goes through the account collection's own write handlers and leaves the device only
 * after the account has it. Returns how many rows are still on the device: zero unless an upload failed.
 */
export async function importLocalTodos(device: TodoCollection, account: TodoCollection) {
  const rows = await device.toArrayWhenReady();
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const row of rows) {
    try {
      // A retry after a partial upload finds the row in the account already; create is idempotent too
      if (!account.has(row.id)) {
        // The server sets the owner and the timestamps; createdAt here only orders the optimistic row
        await account
          .insert({
            completed: false,
            createdAt: row.createdAt,
            id: row.id,
            ownerId: "",
            title: row.title,
            updatedAt: row.updatedAt
          })
          .when("settled");
      }
      // todo.create takes only id and title, so completion is a second write
      if (row.completed && !account.get(row.id)?.completed) {
        await account
          .update(row.id, (draft) => {
            draft.completed = true;
          })
          .when("settled");
      }
      await device.delete(row.id).when("settled");
    } catch {
      // Stop at the first failure so the rest keep their order for the next attempt
      break;
    }
  }

  return device.size;
}
