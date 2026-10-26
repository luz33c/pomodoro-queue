import { type PersistedCollectionPersistence } from "@tanstack/electron-db-sqlite-persistence";
import { createElectronSQLitePersistence } from "@tanstack/electron-db-sqlite-persistence/renderer";

import { getDesktopBridge } from "#/shared/host/desktop-bridge";
import { host } from "#/shared/host/index";

export type DataMode = "cloud" | "local";

/**
 * Where entity collections keep their rows. The web host syncs with the cloud through Electric and oRPC.
 * The desktop host keeps rows on this machine until desktop sign-in and the sync toggle exist.
 * Entities repeat this check as a literal `import.meta.env.MODE` comparison when picking a collection,
 * so the web build can drop the SQLite packages.
 */
export const dataMode: DataMode = host === "desktop" ? "local" : "cloud";

let localPersistence: PersistedCollectionPersistence | null | undefined;

/**
 * The desktop shell's SQLite file, reached through the preload bridge. Null without the bridge,
 * such as the desktop build opened in a plain browser.
 */
export function getLocalPersistence(): PersistedCollectionPersistence | null {
  if (localPersistence === undefined) {
    const bridge = getDesktopBridge();
    localPersistence = bridge
      ? createElectronSQLitePersistence({ invoke: bridge.sqliteInvoke })
      : null;
  }

  return localPersistence;
}
