import { createBrowserHistory, createHashHistory } from "@tanstack/react-router";

export type Host = "web" | "desktop";

/** Chosen at build time by the Vite mode, so the bundler drops the other host's branches. */
export const host: Host = import.meta.env.MODE === "desktop" ? "desktop" : "web";

// views:// has no index.html fallback, so the desktop host keeps routes in the hash
export const basepath =
  host === "desktop" ? "/" : import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export function createHistory() {
  return host === "desktop" ? createHashHistory() : createBrowserHistory();
}
