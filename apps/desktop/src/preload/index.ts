// Runs inside the main window's webview as its preload (see build.views in electrobun.config.ts).
// apps/app never imports electrobun; it only reads the window.tsuDesktop bridge installed here.
import { type ElectronSQLitePersistenceOptions } from "@tanstack/electron-db-sqlite-persistence";
import { Electroview } from "electrobun/view";

import { decodeRpc, encodeRpc } from "#shared/rpc/codec";
import { type DesktopRPC, PERSISTENCE_RPC_TIMEOUT_MS } from "#shared/rpc/schema";

// Same shape as DesktopBridge in apps/app/src/shared/host/desktop-bridge.ts; change both together
type DesktopBridge = {
  sqliteInvoke: NonNullable<ElectronSQLitePersistenceOptions["invoke"]>;
};

declare global {
  // Global augmentation has to merge into the DOM's Window interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    tsuDesktop?: DesktopBridge;
  }
}

const rpc = Electroview.defineRPC<DesktopRPC>({
  handlers: {},
  maxRequestTime: PERSISTENCE_RPC_TIMEOUT_MS
});

// The instance wires the RPC transport to the host socket; nothing else needs a reference to it.
void new Electroview({ rpc });

window.tsuDesktop = {
  sqliteInvoke: async (channel, request) =>
    decodeRpc(await rpc.request.sqlitePersistence(encodeRpc({ channel, request })))
};
