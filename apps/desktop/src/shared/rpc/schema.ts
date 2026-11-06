import { type ElectronIpcMainLike } from "@tanstack/electron-db-sqlite-persistence";
import { type RPCSchema } from "electrobun/main";

import { type DesktopAuthConfig, type DesktopAuthState } from "#shared/auth/types";

import { type RpcEncoded } from "./codec";

// TanStack's IPC envelopes are not exported directly, so derive them from the main-process handler type.
type PersistenceListener = Parameters<ElectronIpcMainLike["handle"]>[1];
export type PersistenceRequest = Parameters<PersistenceListener>[1];
export type PersistenceResponse = Awaited<ReturnType<PersistenceListener>>;

type PersistenceCall = { channel: string; request: PersistenceRequest };

/** RPC between the main process and the window's preload. */
export type DesktopRPC = {
  bun: RPCSchema<{
    requests: {
      sqlitePersistence: {
        params: RpcEncoded<PersistenceCall>;
        response: RpcEncoded<PersistenceResponse>;
      };
      authConfigure: { params: DesktopAuthConfig; response: DesktopAuthState };
      // Returns once the browser opens; the result arrives later as an authChanged message.
      authSignIn: { params: void; response: DesktopAuthState };
      authCancelSignIn: { params: void; response: DesktopAuthState };
      authSignOut: { params: void; response: DesktopAuthState };
      authGetToken: { params: void; response: string | null };
    };
  }>;
  webview: RPCSchema<{
    messages: {
      authChanged: DesktopAuthState;
    };
  }>;
};

// SQLite work can outlast Electrobun's 1 s default; TanStack's own request timeout still applies.
export const PERSISTENCE_RPC_TIMEOUT_MS = 60_000;
