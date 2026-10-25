import Electrobun, { type BrowserWindow, Utils } from "electrobun/main";

import { DEV_VIEW_ORIGIN } from "./view-url";

// The navigationRules constructor option has no effect in Electrobun 2.0.4, so the rules are set at runtime.
// "^" blocks, "*" is a wildcard, and the last matching rule wins.
const NAVIGATION_RULES = ["^*", "views://*", `${DEV_VIEW_ORIGIN}/*`];

// Only these schemes are handed to the operating system.
const EXTERNAL_URL_PATTERN = /^(https?:|mailto:)/i;

// One target="_blank" click can produce both a blocked will-navigate and a new-window-open.
const DEDUPE_WINDOW_MS = 1000;

function readBlockedNavigation(event: unknown) {
  const detail = (event as { data?: { detail?: unknown } }).data?.detail;
  if (typeof detail !== "string") {
    return null;
  }

  try {
    const navigation = JSON.parse(detail) as { allowed?: unknown; url?: unknown };
    return navigation.allowed === false && typeof navigation.url === "string"
      ? navigation.url
      : null;
  } catch {
    return null;
  }
}

function readNewWindowUrl(event: unknown) {
  const detail = (event as { data?: { detail?: unknown } }).data?.detail;
  if (typeof detail === "string") {
    return detail;
  }

  const url = (detail as { url?: unknown } | undefined)?.url;
  return typeof url === "string" ? url : null;
}

/** Keeps the window on the app's own origins and opens every other link in the system browser. */
export function routeExternalLinks(window: BrowserWindow) {
  window.webview.setNavigationRules(NAVIGATION_RULES);

  let lastOpened = { at: 0, url: "" };

  function openExternally(url: string | null) {
    if (!url || !EXTERNAL_URL_PATTERN.test(url)) {
      return;
    }

    const now = Date.now();
    if (url === lastOpened.url && now - lastOpened.at < DEDUPE_WINDOW_MS) {
      return;
    }

    lastOpened = { at: now, url };
    Utils.openExternal(url);
  }

  window.webview.on("will-navigate", (event) => {
    openExternally(readBlockedNavigation(event));
  });

  // Native renderer only: CEF drops window.open and target="_blank" without emitting this event.
  Electrobun.events.on("new-window-open", (event) => {
    openExternally(readNewWindowUrl(event));
  });
}
