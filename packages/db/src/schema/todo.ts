import { boolean, index, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const todo = snakeCase.table(
  "todo",
  {
    id: uuid().defaultRandom().primaryKey(),
    ownerId: text().notNull(),
    title: text().notNull(),
    completed: boolean().default(false).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [index("todo_owner_id_idx").on(table.ownerId)]
);

export type Todo = typeof todo.$inferSelect;
export type NewTodo = typeof todo.$inferInsert;
