import Electrobun, { BrowserView } from "electrobun/main";

import { decodeRpc, encodeRpc } from "#shared/rpc/codec";
import { type DesktopRPC, PERSISTENCE_RPC_TIMEOUT_MS } from "#shared/rpc/schema";

import { openSQLitePersistence } from "./lib/sqlite/open";
import { openMainWindow } from "./ui/main-window";

const sqlitePersistence = openSQLitePersistence();
console.debug(`SQLite persistence: ${sqlitePersistence.databasePath}`);

// Every quit path, including closing the last window, emits before-quit. Closing the database
// checkpoints its WAL into the main file.
Electrobun.events.on("before-quit", () => {
  sqlitePersistence.close();
});

const rpc = BrowserView.defineRPC<DesktopRPC>({
  handlers: {
    requests: {
      sqlitePersistence: async (call) => encodeRpc(await sqlitePersistence.handle(decodeRpc(call)))
    }
  },
  maxRequestTime: PERSISTENCE_RPC_TIMEOUT_MS
});

await openMainWindow(rpc);
