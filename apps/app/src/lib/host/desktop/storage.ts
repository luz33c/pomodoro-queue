import {
  type PersistedCollectionPersistence,
  persistedCollectionOptions
} from "@tanstack/electron-db-sqlite-persistence";
import { createElectronSQLitePersistence } from "@tanstack/electron-db-sqlite-persistence/renderer";
import { type Collection, createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";

import { getDesktopBridge } from "#/lib/host/desktop/bridge";
import { type DeviceCollectionConfig, type HostStorage } from "#/lib/host/types";

let persistence: PersistedCollectionPersistence | null | undefined;

/**
 * The shell's SQLite file, reached through the preload bridge. Null without the bridge, such as the
 * desktop build opened in a plain browser; collections then keep rows in memory until reload.
 */
function getPersistence(): PersistedCollectionPersistence | null {
  if (persistence === undefined) {
    const bridge = getDesktopBridge();
    persistence = bridge ? createElectronSQLitePersistence({ invoke: bridge.sqliteInvoke }) : null;
  }

  return persistence;
}

// persistedCollectionOptions keeps the sync config's utils (refetch, writeUpsert) and adds a cache.
// Its overloads cannot see through a generic config, so the wrapper is typed by what it preserves.
const withSQLiteCache = persistedCollectionOptions as unknown as <TConfig extends object>(
  options: TConfig & { persistence: PersistedCollectionPersistence; schemaVersion: number }
) => TConfig;

/** Account rows cached in SQLite per collection id; device rows persisted without a server copy. */
export const desktopStorage: HostStorage = {
  cacheAccountRows(config, schemaVersion) {
    const store = getPersistence();
    return store ? withSQLiteCache({ ...config, persistence: store, schemaVersion }) : config;
  },
  deviceCollection<T extends object>({
    getKey,
    id,
    schema,
    schemaVersion
  }: DeviceCollectionConfig<T>) {
    const store = getPersistence();
    // The overloads infer rows from a concrete schema and cannot from a generic one, so the schema goes
    // in untyped (it still validates every write) and the result is typed by the config
    const rowSchema = schema as never;
    const collection = store
      ? createCollection(
          persistedCollectionOptions({
            getKey,
            id,
            persistence: store,
            schema: rowSchema,
            schemaVersion
          })
        )
      : createCollection(localOnlyCollectionOptions({ getKey, id, schema: rowSchema }));
    return collection as unknown as Collection<T, string | number>;
  }
};
