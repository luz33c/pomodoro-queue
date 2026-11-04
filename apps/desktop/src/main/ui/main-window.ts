import { BrowserWindow } from "electrobun/main";
import { type RPCWithTransport } from "electrobun/main/rpc";

import { routeExternalLinks } from "./navigation";
import { resolveViewUrl } from "./view-url";

// Built from src/preload/index.ts through build.views in electrobun.config.ts
const PRELOAD_URL = "views://preload/index.js";

/** Opens the app window with the preload bridge and the navigation policy in place. */
export async function openMainWindow<T extends RPCWithTransport>(rpc: T) {
  const window = new BrowserWindow({
    frame: { height: 820, width: 1280, x: 120, y: 120 },
    preload: PRELOAD_URL,
    rpc,
    title: "TSU Stack",
    url: await resolveViewUrl()
  });

  routeExternalLinks(window);
  return window;
}
