/**
 * The shape version each client requests per synced table. Raise it together with a new column list
 * in packages/api's shape definitions; the server keeps serving older versions until clients move on.
 */
export const SHAPE_VERSIONS = {
  todo: 1
} as const;
