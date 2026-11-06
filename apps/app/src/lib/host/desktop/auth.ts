import { useSyncExternalStore } from "react";

import { ENV_APP } from "@uni-stack/env/app/env";

import { getDesktopBridge } from "#/lib/host/desktop/bridge";
import { type AppAuth, type BrowserSignIn, type BrowserSignInState } from "#/lib/host/types";

// The desktop session lives in the shell's main process. This module mirrors its state for React:
// the main process pushes every change, and the window never sees the refresh token.

const SIGNED_OUT: BrowserSignInState = { error: null, status: "signedOut", userId: null };

let snapshot: BrowserSignInState = { error: null, status: "loading", userId: null };
let started = false;
const listeners = new Set<() => void>();

function setSnapshot(next: BrowserSignInState) {
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

function start() {
  if (started) {
    return;
  }
  started = true;

  // The desktop build opened in a plain browser has no shell to sign in with.
  const bridge = getDesktopBridge();
  if (!bridge) {
    setSnapshot(SIGNED_OUT);
    return;
  }

  bridge.auth.subscribe(setSnapshot);
  // A second window gets no push for a session that is already restored, so it reads the reply.
  bridge.auth
    .configure({
      clientId: ENV_APP.VITE_CLERK_DESKTOP_CLIENT_ID ?? "",
      publishableKey: ENV_APP.VITE_CLERK_PUBLISHABLE_KEY
    })
    .then(setSnapshot, (error: unknown) => {
      console.error("Configuring desktop sign-in failed", error);
      setSnapshot({ ...SIGNED_OUT, error: "failed" });
    });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function useDesktopAuthState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Stable functions; the state changes they cause arrive through the main process's push.
const getToken = async () => (await getDesktopBridge()?.auth.getToken()) ?? null;
const signOut = async () => {
  await getDesktopBridge()?.auth.signOut();
};

export const desktopBrowserSignIn: BrowserSignIn = {
  cancel: async () => {
    await getDesktopBridge()?.auth.cancelSignIn();
  },
  start: async () => {
    await getDesktopBridge()?.auth.signIn();
  },
  useStatus: useDesktopAuthState
};

export function useDesktopAppAuth(): AppAuth {
  const { status, userId } = useDesktopAuthState();

  return {
    getToken,
    isLoaded: status !== "loading",
    isSignedIn: status === "signedIn",
    signOut,
    userId
  };
}
