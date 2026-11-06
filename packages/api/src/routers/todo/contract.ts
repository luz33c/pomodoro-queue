import { type TodoRow } from "@uni-stack/core/todo";
import { type Todo } from "@uni-stack/db/schema";

/** Keys present on only one side, or typed differently on each; never when the rows match. */
type DriftedKeys<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? [A[K], B[K]] extends [B[K], A[K]]
        ? never
        : K
      : K
    : K;
}[keyof A | keyof B];

/**
 * Compile-time check that the `todo` table row and the client row contract have the same fields.
 * `todo.list` already rejects a renamed, removed, or retyped column through its output schema; this
 * also rejects a column added on only one side, which Zod would otherwise strip without an error.
 * On drift the error names the column, e.g. Type 'true' is not assignable to type '"note"'.
 */
export const todoRowMatchesTable: [DriftedKeys<Todo, TodoRow>] extends [never]
  ? true
  : DriftedKeys<Todo, TodoRow> = true;
