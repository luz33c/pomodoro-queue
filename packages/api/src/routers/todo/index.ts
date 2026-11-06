import { changes } from "#/routers/todo/procedures/changes";
import { create } from "#/routers/todo/procedures/create";
import { list } from "#/routers/todo/procedures/list";
import { remove } from "#/routers/todo/procedures/remove";
import { update } from "#/routers/todo/procedures/update";

// Clients hold the list in a TanStack DB query collection: `list` fills it, the writes return the
// stored row so the collection applies it without fetching the whole list again, and `changes`
// tells every open client to refetch when another device writes
export const todoRouter = {
  changes,
  create,
  list,
  remove,
  update
};
