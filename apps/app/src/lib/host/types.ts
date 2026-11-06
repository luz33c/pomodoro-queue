import { type Collection, type StandardSchema } from "@tanstack/react-db";
import { type RouterHistory } from "@tanstack/react-router";
import { type ReactNode } from "react";

export type AppAuth = {
  getToken: () => Promise<string | null>;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  userId: string | null;
};

// The browser sign-in shapes match apps/desktop/src/shared/auth/types.ts; change both together.
export type BrowserSignInError =
  | "denied"
  | "failed"
  | "not_configured"
  | "port_unavailable"
  | "session_ended"
  | "timeout";

export type BrowserSignInState = {
  status: "loading" | "signedIn" | "signedOut" | "signingIn";
  userId: string | null;
  /** Why the last sign-in attempt or session ended; cleared when a new attempt starts. */
  error: BrowserSignInError | null;
};

/** Sign-in that opens the system browser and returns to the app on its own. */
export type BrowserSignIn = {
  cancel: () => Promise<void>;
  start: () => Promise<void>;
  useStatus: () => BrowserSignInState;
};

/** How a collection of this device's own rows is stored. */
export type DeviceCollectionConfig<T extends object> = {
  getKey: (row: T) => string | number;
  id: string;
  schema: StandardSchema<T>;
  /** Bump when the row shape changes. Device rows have no other copy, so a bump also needs a migration. */
  schemaVersion: number;
};

export type HostStorage = {
  /**
   * Account rows come from the server. The web keeps them in memory; desktop also caches them in
   * SQLite so they show at once and stay readable offline. A cache whose `schemaVersion` no longer
   * matches is dropped and refetched, since the account holds the rows.
   */
  cacheAccountRows: <TConfig extends object>(config: TConfig, schemaVersion: number) => TConfig;
  /** This device's own rows, kept without an account. Null when the host keeps nothing on the device. */
  deviceCollection: <T extends object>(
    config: DeviceCollectionConfig<T>
  ) => Collection<T, string | number> | null;
};

/**
 * Everything that differs between the web and desktop builds. `#/lib/host/runtime` resolves to one
 * implementation per build, so the other is never imported. Callers depend on these capabilities and
 * never ask which host they run in.
 */
export type HostAdapter = {
  auth: {
    /** Desktop signs in through the system browser; null on the web, which signs in on the website. */
    browserSignIn: BrowserSignIn | null;
    Provider: (props: { children: ReactNode }) => ReactNode;
    /** Where a signed-out user goes to sign in. Null when the app works signed out, on device rows. */
    signInRedirect: ((returnTo: string) => string) | null;
    useAuth: () => AppAuth;
  };
  /** Anchor props for links that leave the app. */
  externalLinkProps: { rel?: string; target?: string };
  router: {
    basepath: string;
    createHistory: () => RouterHistory;
  };
  storage: HostStorage;
};
