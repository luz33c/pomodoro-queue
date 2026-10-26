import { BrowserView, BrowserWindow } from "electrobun/main";

import { routeExternalLinks } from "./external-links";
import { decodeRpc, encodeRpc } from "./rpc-codec";
import { type DesktopRPC, PERSISTENCE_RPC_TIMEOUT_MS } from "./rpc-schema";
import { openSQLitePersistence } from "./sqlite-persistence";
import { resolveViewUrl } from "./view-url";

// Built from src/bun/webview-bridge.ts through build.views in electrobun.config.ts
const WEBVIEW_BRIDGE_URL = "views://webview-bridge/index.js";

const sqlitePersistence = openSQLitePersistence();
console.debug(`SQLite persistence: ${sqlitePersistence.databasePath}`);

const rpc = BrowserView.defineRPC<DesktopRPC>({
  handlers: {
    requests: {
      sqlitePersistence: async (call) => encodeRpc(await sqlitePersistence.handle(decodeRpc(call)))
    }
  },
  maxRequestTime: PERSISTENCE_RPC_TIMEOUT_MS
});

const mainWindow = new BrowserWindow({
  frame: { height: 820, width: 1280, x: 120, y: 120 },
  preload: WEBVIEW_BRIDGE_URL,
  rpc,
  title: "TSU Stack",
  url: await resolveViewUrl()
});

routeExternalLinks(mainWindow);
