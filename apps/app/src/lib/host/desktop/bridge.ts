import { type ElectronSQLitePersistenceOptions } from "@tanstack/electron-db-sqlite-persistence/renderer";

import { type BrowserSignInState } from "#/lib/host/types";

type DesktopAuthBridge = {
  cancelSignIn: () => Promise<BrowserSignInState>;
  /** Hands the public OAuth settings to the main process, which restores a stored session once. */
  configure: (config: { clientId: string; publishableKey: string }) => Promise<BrowserSignInState>;
  getToken: () => Promise<string | null>;
  /** Opens the system browser; the result arrives later through subscribe(). */
  signIn: () => Promise<BrowserSignInState>;
  signOut: () => Promise<BrowserSignInState>;
  subscribe: (listener: (state: BrowserSignInState) => void) => () => void;
};

/** Installed by the desktop shell's preload (apps/desktop/src/preload/index.ts). */
export type DesktopBridge = {
  auth: DesktopAuthBridge;
  sqliteInvoke: NonNullable<ElectronSQLitePersistenceOptions["invoke"]>;
};

declare global {
  // Global augmentation has to merge into the DOM's Window interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    tsuDesktop?: DesktopBridge;
  }
}

/** The only place apps/app reads the desktop bridge. Null in a plain browser. */
export function getDesktopBridge(): DesktopBridge | null {
  return window.tsuDesktop ?? null;
}
