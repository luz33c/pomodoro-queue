// Electrobun RPC sends JSON, which turns Date into an ISO string; Electron IPC's structured clone keeps it.
// TanStack DB stores a Date as a tagged SQLite value only when it still sees a Date, so both ends of the
// bridge tag Dates for the trip. Other non-JSON values (BigInt, Map, Set) are not encoded.
const DATE_TAG = "__tsuRpcDate";

declare const encodedValue: unique symbol;

/** A value prepared for the JSON transport. Decode it on the other side to get `T` back. */
export type RpcEncoded<T> = { readonly [encodedValue]: T };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function encodeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return { [DATE_TAG]: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  if (isPlainObject(value)) {
    const tagged = value[DATE_TAG];
    if (typeof tagged === "string" && Object.keys(value).length === 1) {
      return new Date(tagged);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeValue(item)]));
  }
  return value;
}

export function encodeRpc<T>(value: T): RpcEncoded<T> {
  return encodeValue(value) as RpcEncoded<T>;
}

export function decodeRpc<T>(value: RpcEncoded<T>): T {
  return decodeValue(value) as T;
}
