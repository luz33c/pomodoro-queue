// Runs inside the main window's webview as its preload (see build.views in electrobun.config.ts).
// apps/app never imports electrobun; it only reads the window.tsuDesktop bridge installed here.
import { type ElectronSQLitePersistenceOptions } from "@tanstack/electron-db-sqlite-persistence";
import { Electroview } from "electrobun/view";

import { type DesktopAuthConfig, type DesktopAuthState } from "#shared/auth/types";
import { decodeRpc, encodeRpc } from "#shared/rpc/codec";
import { type DesktopRPC, PERSISTENCE_RPC_TIMEOUT_MS } from "#shared/rpc/schema";

type DesktopAuthListener = (state: DesktopAuthState) => void;

// Same shape as DesktopBridge in apps/app/src/lib/host/types.ts and lib/host/desktop/bridge.ts; change both together
type DesktopBridge = {
  auth: {
    cancelSignIn: () => Promise<DesktopAuthState>;
    configure: (config: DesktopAuthConfig) => Promise<DesktopAuthState>;
    getToken: () => Promise<string | null>;
    signIn: () => Promise<DesktopAuthState>;
    signOut: () => Promise<DesktopAuthState>;
    /** Called with every state the main process pushes, including results of a browser sign-in. */
    subscribe: (listener: DesktopAuthListener) => () => void;
  };
  sqliteInvoke: NonNullable<ElectronSQLitePersistenceOptions["invoke"]>;
};

declare global {
  // Global augmentation has to merge into the DOM's Window interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    tsuDesktop?: DesktopBridge;
  }
}

const authListeners = new Set<DesktopAuthListener>();

const rpc = Electroview.defineRPC<DesktopRPC>({
  handlers: {
    messages: {
      authChanged: (state) => {
        for (const listener of authListeners) {
          listener(state);
        }
      }
    }
  },
  maxRequestTime: PERSISTENCE_RPC_TIMEOUT_MS
});

// The instance wires the RPC transport to the host socket; nothing else needs a reference to it.
void new Electroview({ rpc });

window.tsuDesktop = {
  auth: {
    cancelSignIn: () => rpc.request.authCancelSignIn(),
    configure: (config) => rpc.request.authConfigure(config),
    getToken: () => rpc.request.authGetToken(),
    signIn: () => rpc.request.authSignIn(),
    signOut: () => rpc.request.authSignOut(),
    subscribe: (listener) => {
      authListeners.add(listener);
      return () => authListeners.delete(listener);
    }
  },
  sqliteInvoke: async (channel, request) =>
    decodeRpc(await rpc.request.sqlitePersistence(encodeRpc({ channel, request })))
};
