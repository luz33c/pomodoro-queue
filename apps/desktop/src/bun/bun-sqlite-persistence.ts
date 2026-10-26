// Adapted from @tanstack/node-db-sqlite-persistence 0.2.37 (MIT, TanStack), using BunSQLiteDriver.
import { type Database } from "bun:sqlite";

import {
  DEFAULT_APPLIED_TX_PRUNE_MAX_AGE_SECONDS,
  DEFAULT_APPLIED_TX_PRUNE_MAX_ROWS,
  SingleProcessCoordinator,
  createSQLiteCorePersistenceAdapter,
  type PersistedCollectionCoordinator,
  type PersistedCollectionMode,
  type PersistedCollectionPersistence,
  type SQLiteCoreAdapterOptions
} from "@tanstack/db-sqlite-persistence-core";

import { BunSQLiteDriver } from "./bun-sqlite-driver";

type CoreSchemaMismatchPolicy = "sync-present-reset" | "sync-absent-error" | "reset";

export type BunSQLiteSchemaMismatchPolicy = CoreSchemaMismatchPolicy | "throw";

export type BunSQLitePersistenceOptions = Omit<
  SQLiteCoreAdapterOptions,
  "driver" | "schemaVersion" | "schemaMismatchPolicy"
> & {
  database: Database;
  pragmas?: ReadonlyArray<string>;
  coordinator?: PersistedCollectionCoordinator;
  schemaMismatchPolicy?: BunSQLiteSchemaMismatchPolicy;
};

function resolveSchemaMismatchPolicy(
  explicitPolicy: BunSQLiteSchemaMismatchPolicy | undefined,
  mode: PersistedCollectionMode
): CoreSchemaMismatchPolicy {
  if (explicitPolicy === "throw") {
    return "sync-absent-error";
  }

  if (explicitPolicy) {
    return explicitPolicy;
  }

  // Synced collections can refetch after a reset; local-only rows have no other copy.
  return mode === "sync-present" ? "sync-present-reset" : "sync-absent-error";
}

/**
 * One persistence instance shared by every collection on the same database. Each collection's
 * schema version is resolved by `persistedCollectionOptions` through `resolvePersistenceForCollection`.
 */
export function createBunSQLitePersistence(
  options: BunSQLitePersistenceOptions
): PersistedCollectionPersistence {
  const driver = new BunSQLiteDriver({
    database: options.database,
    ...(options.pragmas ? { pragmas: options.pragmas } : {})
  });
  const coordinator = options.coordinator ?? new SingleProcessCoordinator();
  const adapterBaseOptions = {
    appliedTxPruneMaxRows: options.appliedTxPruneMaxRows ?? DEFAULT_APPLIED_TX_PRUNE_MAX_ROWS,
    appliedTxPruneMaxAgeSeconds:
      options.appliedTxPruneMaxAgeSeconds ?? DEFAULT_APPLIED_TX_PRUNE_MAX_AGE_SECONDS,
    pullSinceReloadThreshold: options.pullSinceReloadThreshold,
    cacheGenerationClaimTtlMs: options.cacheGenerationClaimTtlMs,
    now: options.now
  };
  const adapterCache = new Map<string, ReturnType<typeof createSQLiteCorePersistenceAdapter>>();

  function getAdapter(mode: PersistedCollectionMode, schemaVersion: number | undefined) {
    const schemaMismatchPolicy = resolveSchemaMismatchPolicy(options.schemaMismatchPolicy, mode);
    const cacheKey = `${schemaMismatchPolicy}|schema:${schemaVersion ?? "default"}`;
    const cached = adapterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const adapter = createSQLiteCorePersistenceAdapter({
      ...adapterBaseOptions,
      driver,
      schemaMismatchPolicy,
      ...(schemaVersion === undefined ? {} : { schemaVersion })
    });
    adapterCache.set(cacheKey, adapter);
    return adapter;
  }

  function createCollectionPersistence(
    mode: PersistedCollectionMode,
    schemaVersion: number | undefined
  ): PersistedCollectionPersistence {
    return { adapter: getAdapter(mode, schemaVersion), coordinator };
  }

  return {
    ...createCollectionPersistence("sync-absent", undefined),
    resolvePersistenceForCollection: ({ mode, schemaVersion }) =>
      createCollectionPersistence(mode, schemaVersion),
    resolvePersistenceForMode: (mode) => createCollectionPersistence(mode, undefined)
  };
}
