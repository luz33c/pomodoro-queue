import { Updater } from "electrobun/main";

// Matches DESKTOP_DEV_PORT in apps/app/vite.config.ts
export const DEV_VIEW_ORIGIN = "http://localhost:3003";

const PACKAGED_VIEW_URL = "views://mainview/index.html";

/** Loads the app's desktop dev server in the dev channel when it answers, otherwise the packaged view. */
export async function resolveViewUrl() {
  if ((await Updater.localInfo.channel()) !== "dev") {
    return PACKAGED_VIEW_URL;
  }

  try {
    await fetch(DEV_VIEW_ORIGIN, { method: "HEAD" });
    return DEV_VIEW_ORIGIN;
  } catch {
    return PACKAGED_VIEW_URL;
  }
}
