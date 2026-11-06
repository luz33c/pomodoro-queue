// Shared by the main process and the preload. apps/app declares the same shapes in
// apps/app/src/lib/host/types.ts and lib/host/desktop/bridge.ts; change both together.

/** What the window needs to start OAuth. Both values are public and compiled into the app bundle. */
export type DesktopAuthConfig = {
  /** Client ID of the Clerk OAuth application registered for the desktop app. */
  clientId: string;
  /** The Clerk publishable key; the main process derives the Frontend API URL from it. */
  publishableKey: string;
};

export type DesktopAuthError =
  | "denied"
  | "failed"
  | "not_configured"
  | "port_unavailable"
  | "session_ended"
  | "timeout";

export type DesktopAuthState = {
  status: "loading" | "signedIn" | "signedOut" | "signingIn";
  userId: string | null;
  /** Why the last sign-in attempt or session ended; cleared when a new attempt starts. */
  error: DesktopAuthError | null;
};
