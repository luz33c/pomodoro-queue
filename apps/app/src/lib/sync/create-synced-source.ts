import { type Collection, type StandardSchema } from "@tanstack/react-db";

import { hostAdapter, useAppAuth } from "#/lib/host/index";
import {
  type RefetchableCollection,
  type SubscribeChanges,
  useLiveChanges
} from "#/lib/sync/live-changes";
import { registerUserScopedCollection } from "#/lib/sync/user-scoped-collections";

/** Where the rows on screen live: the signed-in account, or only this device. */
export type SyncScope = "account" | "device";

export type SyncedSource<T extends object> = {
  collection: Collection<T, string | number>;
  scope: SyncScope;
};

type AccountCollection<T extends object> = Collection<T, string | number> & RefetchableCollection;

/** Wraps a collection config so the host caches its rows; identity on hosts that cache nothing. */
export type CacheAccountRows = <TConfig extends object>(config: TConfig) => TConfig;

type SyncedSourceConfig<T extends object> = {
  /**
   * The entity's account collection: oRPC reads and writes, wrapped by `cache` before
   * `createCollection`. Called once per signed-in user with that user's collection id.
   */
  account: (id: string, cache: CacheAccountRows) => AccountCollection<T>;
  getKey: (row: T) => string | number;
  /** Collection ids derive from it: `<name>:<userId>` for account rows, `<name>-local` for device rows. */
  name: string;
  schema: StandardSchema<T>;
  /** Bump when the row shape changes. Device rows have no server copy, so they need a migration first. */
  schemaVersion: number;
  subscribeChanges: SubscribeChanges;
};

/**
 * One synced entity on any host. Signed in, it shows the account's rows, kept current by the server's
 * change stream; signed out, it shows this device's rows where the host keeps any. Entities supply
 * their oRPC calls; storage comes from the host and push from `live-changes`.
 */
export function createSyncedSource<T extends object>(config: SyncedSourceConfig<T>) {
  const { getKey, name, schema, schemaVersion } = config;
  const accounts = new Map<string, AccountCollection<T>>();
  const cache: CacheAccountRows = (collectionConfig) =>
    hostAdapter.storage.cacheAccountRows(collectionConfig, schemaVersion);

  /** This device's own rows. Null on hosts that keep nothing on the device. */
  const device = hostAdapter.storage.deviceCollection({
    getKey,
    id: `${name}-local`,
    schema,
    schemaVersion
  });

  function account(userId: string) {
    const existing = accounts.get(userId);
    if (existing) {
      return existing;
    }

    // One collection per user keeps two accounts' rows apart in memory and on disk
    const collection = config.account(`${name}:${userId}`, cache);
    registerUserScopedCollection(collection);
    accounts.set(userId, collection);
    return collection;
  }

  /** The rows a page shows. Null while sign-in is restoring, so device rows never flash first. */
  function useSource(): SyncedSource<T> | null {
    const { isLoaded, userId } = useAppAuth();
    const accountCollection = isLoaded && userId ? account(userId) : null;

    useLiveChanges(accountCollection, config.subscribeChanges);

    if (!isLoaded) {
      return null;
    }
    if (accountCollection) {
      return { collection: accountCollection, scope: "account" };
    }
    return device ? { collection: device, scope: "device" } : null;
  }

  return { device, useSource };
}
