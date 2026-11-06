import { type TodoCollection } from "#/features/todos/api/todo-source";

export function insertTodo(collection: TodoCollection, title: string) {
  const now = new Date();

  // The id is generated here so a retried create never writes a second row. The server sets
  // the owner from the session; for account rows the synced row replaces this placeholder.
  return collection.insert({
    completed: false,
    createdAt: now,
    id: crypto.randomUUID(),
    ownerId: "",
    title,
    updatedAt: now
  });
}

export function setTodoCompleted(collection: TodoCollection, id: string, completed: boolean) {
  return collection.update(id, (draft) => {
    draft.completed = completed;
    draft.updatedAt = new Date();
  });
}

export function deleteTodo(collection: TodoCollection, id: string) {
  return collection.delete(id);
}
