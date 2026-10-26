import { type ElectronSQLitePersistenceOptions } from "@tanstack/electron-db-sqlite-persistence/renderer";

/** Installed by the desktop shell's preload (apps/desktop/src/bun/webview-bridge.ts). */
export type DesktopBridge = {
  sqliteInvoke: NonNullable<ElectronSQLitePersistenceOptions["invoke"]>;
};

declare global {
  // Global augmentation has to merge into the DOM's Window interface, which a type alias cannot do
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    tsuDesktop?: DesktopBridge;
  }
}

/** The only place apps/app reads the desktop bridge. Null in the web host and in a plain browser. */
export function getDesktopBridge(): DesktopBridge | null {
  return window.tsuDesktop ?? null;
}
