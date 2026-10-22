import { and, eq } from "drizzle-orm";

import { db, type DbExecutor } from "#/client";
import { type NewTodo, type Todo, todo } from "#/schema/todo";

export type TodoKey = Pick<Todo, "id" | "ownerId">;

const byKey = ({ id, ownerId }: TodoKey) => and(eq(todo.id, id), eq(todo.ownerId, ownerId));

export async function listTodos({ ownerId }: Pick<Todo, "ownerId">, executor: DbExecutor = db) {
  return executor.query.todo.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
}

export async function getTodo({ id, ownerId }: TodoKey, executor: DbExecutor = db) {
  return (await executor.query.todo.findFirst({ where: { id, ownerId } })) ?? null;
}

export async function createTodo(
  { ownerId, title }: Pick<NewTodo, "ownerId" | "title">,
  executor: DbExecutor = db
) {
  const [row] = await executor.insert(todo).values({ ownerId, title }).returning();
  return row;
}

export async function updateTodo(
  key: TodoKey,
  { completed, title }: Partial<Pick<NewTodo, "completed" | "title">>,
  executor: DbExecutor = db
) {
  const [row] = await executor.update(todo).set({ completed, title }).where(byKey(key)).returning();
  return row ?? null;
}

export async function deleteTodo(key: TodoKey, executor: DbExecutor = db) {
  const [row] = await executor.delete(todo).where(byKey(key)).returning({ id: todo.id });
  return row ?? null;
}
