import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { exposeElectronSQLitePersistence } from "@tanstack/electron-db-sqlite-persistence/main";
import { Utils } from "electrobun/main";

import { createBunSQLitePersistence } from "./bun-sqlite-persistence";
import {
  type PersistenceCall,
  type PersistenceRequest,
  type PersistenceResponse
} from "./rpc-schema";

const DATABASE_FILE_NAME = "tsu-app.sqlite";

type PersistenceListener = (
  event: unknown,
  request: PersistenceRequest
) => Promise<PersistenceResponse>;

/**
 * Opens the app's SQLite file in the user data folder and serves TanStack DB's persistence protocol.
 * The webview reaches it through the `sqlitePersistence` RPC request instead of Electron IPC.
 */
export function openSQLitePersistence() {
  mkdirSync(Utils.paths.userData, { recursive: true });
  const databasePath = join(Utils.paths.userData, DATABASE_FILE_NAME);
  const database = new Database(databasePath, { create: true });
  const listeners = new Map<string, PersistenceListener>();

  const dispose = exposeElectronSQLitePersistence({
    ipcMain: {
      handle: (channel, listener) => listeners.set(channel, listener),
      removeHandler: (channel) => listeners.delete(channel)
    },
    persistence: createBunSQLitePersistence({ database })
  });

  function handle({ channel, request }: PersistenceCall): Promise<PersistenceResponse> {
    const listener = listeners.get(channel);
    if (!listener) {
      return Promise.reject(new Error(`No SQLite persistence handler for channel "${channel}"`));
    }
    return listener(undefined, request);
  }

  function close() {
    dispose();
    database.close();
  }

  return { close, databasePath, handle };
}
