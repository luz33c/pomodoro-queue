import { create } from "#/routers/todo/procedures/create";
import { list } from "#/routers/todo/procedures/list";
import { remove } from "#/routers/todo/procedures/remove";
import { update } from "#/routers/todo/procedures/update";

// Clients hold the list in a TanStack DB query collection: `list` fills it, and the writes return
// the stored row so the collection applies it without fetching the whole list again
export const todoRouter = {
  create,
  list,
  remove,
  update
};
