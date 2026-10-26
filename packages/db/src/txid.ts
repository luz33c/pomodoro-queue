import { sql } from "drizzle-orm";

import { type DbExecutor } from "#/client";

/**
 * The current transaction's id, as Electric reports it in each change's `txids` header.
 * Call it inside the same transaction as the write: another transaction has a different id,
 * and a client waiting for it would never see it arrive.
 */
export async function getCurrentTxid(executor: DbExecutor): Promise<number> {
  const [row] = await executor.execute<{ txid: string }>(
    sql`SELECT pg_current_xact_id()::xid::text AS txid`
  );
  if (!row) {
    throw new Error("pg_current_xact_id() returned no row");
  }
  return Number(row.txid);
}
