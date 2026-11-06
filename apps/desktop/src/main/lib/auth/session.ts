import { Updater, Utils } from "electrobun/main";

import {
  type DesktopAuthConfig,
  type DesktopAuthError,
  type DesktopAuthState
} from "#shared/auth/types";

import { type CallbackResult, type Loopback, startLoopback } from "./loopback";
import {
  type OAuthClient,
  type Pkce,
  buildAuthorizeUrl,
  createOAuthClient,
  createPkce,
  exchangeCode,
  refreshTokens,
  revokeToken
} from "./oauth";
import { type TokenStore, createTokenStore } from "./token-store";

// The browser round trip includes typing a password or a one-time code.
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;
// Refresh slightly early, so a token does not expire between getToken() and the API verifying it.
const REFRESH_MARGIN_MS = 60_000;

type SignInAttempt = {
  authorizeUrl: string;
  loopback: Loopback;
  pkce: Pkce;
  timer: ReturnType<typeof setTimeout>;
};

type AccessToken = {
  expiresAt: number;
  value: string;
};

type Listener = (state: DesktopAuthState) => void;

const MESSAGES = {
  cancelled: "This sign-in was cancelled. Return to tsu!stack to try again.",
  denied: "Sign-in was cancelled. You can close this tab.",
  failed: "Sign-in failed. Return to tsu!stack and try again.",
  signedIn: "You are signed in. You can close this tab and return to tsu!stack."
};

/**
 * The desktop app's Clerk session, owned by the main process. Windows read its state and ask for
 * access tokens; the refresh token never leaves this process.
 */
export function createAuthSession() {
  let state: DesktopAuthState = { error: null, status: "loading", userId: null };
  let ready: Promise<void> | null = null;
  let client: OAuthClient | null = null;
  let store: TokenStore | null = null;
  let accessToken: AccessToken | null = null;
  let refreshing: Promise<string | null> | null = null;
  let attempt: SignInAttempt | null = null;
  // Bumped whenever the signed-in user changes, so a refresh that finishes afterwards is discarded.
  let generation = 0;
  const listeners = new Set<Listener>();

  function setState(next: DesktopAuthState) {
    state = next;
    for (const listener of listeners) {
      listener(state);
    }
  }

  function setSignedOut(error: DesktopAuthError | null = null) {
    generation += 1;
    accessToken = null;
    setState({ error, status: "signedOut", userId: null });
  }

  async function restore(config: DesktopAuthConfig) {
    if (!config.clientId) {
      setSignedOut("not_configured");
      return;
    }

    client = createOAuthClient(config);
    const { channel, identifier } = await Updater.getLocalInfo();
    store = createTokenStore({ channel, identifier });

    const saved = await store.read();
    if (saved) {
      setState({ error: null, status: "signedIn", userId: saved.userId });
    } else {
      setSignedOut();
    }
  }

  /** Every window calls this on load. Only the first call restores the stored session. */
  async function configure(config: DesktopAuthConfig) {
    ready ??= restore(config).catch((error: unknown) => {
      console.error("Restoring the desktop session failed", error);
      setSignedOut("failed");
    });
    await ready;
    return state;
  }

  function endAttempt(ended: SignInAttempt, error: DesktopAuthError | null) {
    if (attempt !== ended) {
      return;
    }
    clearTimeout(ended.timer);
    ended.loopback.close();
    attempt = null;
    setSignedOut(error);
  }

  async function finishSignIn(current: SignInAttempt, result: CallbackResult) {
    if (attempt !== current || !client || !store) {
      return MESSAGES.cancelled;
    }

    if (result.kind === "error") {
      endAttempt(current, result.error === "access_denied" ? "denied" : "failed");
      return result.error === "access_denied" ? MESSAGES.denied : MESSAGES.failed;
    }

    try {
      const tokens = await exchangeCode(client, {
        code: result.code,
        redirectUri: current.loopback.redirectUri,
        verifier: current.pkce.verifier
      });
      if (attempt !== current) {
        return MESSAGES.cancelled;
      }
      if (!tokens.refreshToken) {
        throw new Error("The token response has no refresh_token; is offline_access granted?");
      }

      await store.write({ refreshToken: tokens.refreshToken, userId: tokens.userId });
      clearTimeout(current.timer);
      current.loopback.close();
      attempt = null;
      generation += 1;
      accessToken = { expiresAt: tokens.accessTokenExpiresAt, value: tokens.accessToken };
      setState({ error: null, status: "signedIn", userId: tokens.userId });
      return MESSAGES.signedIn;
    } catch (error) {
      console.error("Finishing the desktop sign-in failed", error);
      endAttempt(current, "failed");
      return MESSAGES.failed;
    }
  }

  /** Opens the system browser on Clerk's authorize page. The result arrives later as a state change. */
  async function signIn() {
    await ready;
    if (!client || state.status === "signedIn") {
      return state;
    }

    // A second click while waiting reopens the same page instead of starting over.
    if (attempt) {
      Utils.openExternal(attempt.authorizeUrl);
      return state;
    }

    const pkce = await createPkce();
    let current: SignInAttempt | null = null;
    const loopback = startLoopback({
      onCallback: (result) =>
        current ? finishSignIn(current, result) : Promise.resolve(MESSAGES.cancelled),
      state: pkce.state
    });
    if (!loopback) {
      setSignedOut("port_unavailable");
      return state;
    }

    const started: SignInAttempt = {
      authorizeUrl: buildAuthorizeUrl(client, { pkce, redirectUri: loopback.redirectUri }),
      loopback,
      pkce,
      timer: setTimeout(() => endAttempt(started, "timeout"), SIGN_IN_TIMEOUT_MS)
    };
    current = started;
    attempt = started;
    setState({ error: null, status: "signingIn", userId: null });
    Utils.openExternal(started.authorizeUrl);
    return state;
  }

  function cancelSignIn() {
    if (attempt) {
      endAttempt(attempt, null);
    }
    return state;
  }

  async function signOut() {
    if (attempt) {
      endAttempt(attempt, null);
    }
    const saved = await store?.read();
    await store?.clear();
    setSignedOut();
    if (client && saved) {
      void revokeToken(client, saved.refreshToken);
    }
    return state;
  }

  async function refresh(): Promise<string | null> {
    const startedIn = generation;
    const saved = await store?.read();
    if (!client || !store || !saved) {
      setSignedOut("session_ended");
      return null;
    }

    const result = await refreshTokens(client, saved.refreshToken);
    if (generation !== startedIn) {
      return null;
    }
    if (result.kind === "unavailable") {
      return null;
    }
    if (result.kind === "invalid") {
      await store.clear();
      setSignedOut("session_ended");
      return null;
    }

    const { tokens } = result;
    const userId = tokens.userId ?? saved.userId;
    const refreshToken = tokens.refreshToken ?? saved.refreshToken;
    if (refreshToken !== saved.refreshToken || userId !== saved.userId) {
      await store.write({ refreshToken, userId });
    }

    accessToken = { expiresAt: tokens.accessTokenExpiresAt, value: tokens.accessToken };
    if (userId !== state.userId) {
      setState({ ...state, userId });
    }
    return tokens.accessToken;
  }

  /** A current access token, refreshed when it is close to expiry. Null when signed out or offline. */
  async function getToken() {
    if (state.status !== "signedIn") {
      return null;
    }
    if (accessToken && accessToken.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return accessToken.value;
    }

    // Concurrent requests share one refresh, so a rotated refresh token is used only once.
    refreshing ??= refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function dispose() {
    if (attempt) {
      clearTimeout(attempt.timer);
      attempt.loopback.close();
      attempt = null;
    }
  }

  return { cancelSignIn, configure, dispose, getToken, signIn, signOut, subscribe };
}

export type AuthSession = ReturnType<typeof createAuthSession>;
