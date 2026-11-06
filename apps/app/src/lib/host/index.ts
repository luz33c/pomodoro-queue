import { host } from "#/lib/host/runtime";
import { type HostAdapter } from "#/lib/host/types";

export type {
  AppAuth,
  BrowserSignIn,
  BrowserSignInError,
  BrowserSignInState,
  HostAdapter
} from "#/lib/host/types";

/**
 * The running host. `#/lib/host/runtime` is a conditional import in package.json: the desktop build
 * (`vite --mode desktop` adds the `desktop` resolve condition) gets `lib/host/desktop`, every other
 * build gets `lib/host/web`. The other implementation is never imported, so it never reaches the bundle.
 */
export const hostAdapter: HostAdapter = host;

/** The only auth hook pages and providers use. Fixed per build, so hook order never changes. */
export const useAppAuth = hostAdapter.auth.useAuth;
