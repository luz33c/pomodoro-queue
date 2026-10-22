import "@tanstack/react-start/server-only";
import { sql } from "drizzle-orm";
import { type PgAsyncDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { relations } from "#/schema/relations";

const client = postgres(ENV_SERVER.DATABASE_URL);

export const db = drizzle({ client, relations });

/** `db` itself or the `tx` handed out by `db.transaction()`. */
export type DbExecutor = PgAsyncDatabase<PostgresJsQueryResultHKT, typeof relations>;

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
