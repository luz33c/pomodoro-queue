import { type ElectronIpcMainLike } from "@tanstack/electron-db-sqlite-persistence";
import { type RPCSchema } from "electrobun/main";

import { type RpcEncoded } from "./rpc-codec";

// TanStack's IPC envelopes are not exported directly, so derive them from the main-process handler type.
type PersistenceListener = Parameters<ElectronIpcMainLike["handle"]>[1];
export type PersistenceRequest = Parameters<PersistenceListener>[1];
export type PersistenceResponse = Awaited<ReturnType<PersistenceListener>>;

export type PersistenceCall = { channel: string; request: PersistenceRequest };

/** RPC between the main process and the window's webview-bridge preload. */
export type DesktopRPC = {
  bun: RPCSchema<{
    requests: {
      sqlitePersistence: {
        params: RpcEncoded<PersistenceCall>;
        response: RpcEncoded<PersistenceResponse>;
      };
    };
  }>;
  webview: RPCSchema;
};

// SQLite work can outlast Electrobun's 1 s default; TanStack's own request timeout still applies.
export const PERSISTENCE_RPC_TIMEOUT_MS = 60_000;
