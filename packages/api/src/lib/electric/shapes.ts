import { type ShapeName } from "@tsu-stack/core/sync";
import { type TodoRow } from "@tsu-stack/core/todo";
import { type Todo } from "@tsu-stack/db/schema";

type IsSameRow<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Clients type the todo shape's rows as TodoRow; this stops compiling when the Drizzle table drifts from it
// oxlint-disable-next-line no-unused-vars
const todoRowMatchesTable: IsSameRow<Todo, TodoRow> = true;

type ShapeDefinition = {
  table: string;
  /** Authorization filter. `$1` is the signed-in Clerk user id; clients cannot change it. */
  where: string;
  /** Column list per shape version. Keep a version until no supported client requests it. */
  columns: Readonly<Record<number, string>>;
};

export type ResolvedShape = {
  columns: string;
  table: string;
  where: string;
};

const SHAPES = {
  todo: {
    columns: {
      1: "id,owner_id,title,completed,created_at,updated_at"
    },
    table: "todo",
    where: "owner_id = $1"
  }
} as const satisfies Record<ShapeName, ShapeDefinition>;

function isShapeName(name: string): name is ShapeName {
  return Object.hasOwn(SHAPES, name);
}

/** Looks up a shape from its URL segments. Null when the name or version is unknown. */
export function resolveShape(name: string, version: string): ResolvedShape | null {
  if (!isShapeName(name)) {
    return null;
  }

  const shape: ShapeDefinition = SHAPES[name];
  const columns = shape.columns[Number(version)];
  if (!columns) {
    return null;
  }

  return { columns, table: shape.table, where: shape.where };
}
