import "@tanstack/react-start/server-only";
import { sql } from "drizzle-orm";
import { type PgAsyncDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ENV_SERVER } from "@uni-stack/env/server/env";

import { relations } from "#/schema/relations";

/** The postgres.js client behind `db`. PostgresPublisher uses it for LISTEN/NOTIFY. */
export const pgClient = postgres(ENV_SERVER.DATABASE_URL);

export type PgClient = typeof pgClient;

export const db = drizzle({ client: pgClient, relations });

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
