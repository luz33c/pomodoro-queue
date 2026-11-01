import { create } from "#/routers/todo/procedures/create";
import { remove } from "#/routers/todo/procedures/remove";
import { update } from "#/routers/todo/procedures/update";

// Writes for the synced todo shape. Clients wait for the returned txid on the shape stream;
// a null txid means nothing was written, so there is nothing to wait for.
export const todoRouter = {
  create,
  update,
  remove
};
