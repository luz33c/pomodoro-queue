import Electrobun, { BrowserView } from "electrobun/main";

import { decodeRpc, encodeRpc } from "#shared/rpc/codec";
import { type DesktopRPC, PERSISTENCE_RPC_TIMEOUT_MS } from "#shared/rpc/schema";

import { createAuthSession } from "./lib/auth/session";
import { openSQLitePersistence } from "./lib/sqlite/open";
import { openMainWindow } from "./ui/main-window";

const sqlitePersistence = openSQLitePersistence();
console.debug(`SQLite persistence: ${sqlitePersistence.databasePath}`);

const authSession = createAuthSession();

// Every quit path, including closing the last window, emits before-quit. Closing the database
// checkpoints its WAL into the main file.
Electrobun.events.on("before-quit", () => {
  authSession.dispose();
  sqlitePersistence.close();
});

const rpc = BrowserView.defineRPC<DesktopRPC>({
  handlers: {
    requests: {
      authCancelSignIn: () => authSession.cancelSignIn(),
      authConfigure: (config) => authSession.configure(config),
      authGetToken: () => authSession.getToken(),
      authSignIn: () => authSession.signIn(),
      authSignOut: () => authSession.signOut(),
      sqlitePersistence: async (call) => encodeRpc(await sqlitePersistence.handle(decodeRpc(call)))
    }
  },
  maxRequestTime: PERSISTENCE_RPC_TIMEOUT_MS
});

const mainWindow = await openMainWindow(rpc);

let previousStatus: string | null = null;
authSession.subscribe((state) => {
  rpc.send.authChanged(state);
  // The user finished in the browser; bring the app back in front of it.
  if (previousStatus === "signingIn" && state.status === "signedIn") {
    mainWindow.activate();
  }
  previousStatus = state.status;
});
