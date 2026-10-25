import { BrowserWindow } from "electrobun/main";

import { routeExternalLinks } from "./external-links";
import { resolveViewUrl } from "./view-url";

const mainWindow = new BrowserWindow({
  frame: { height: 820, width: 1280, x: 120, y: 120 },
  title: "TSU Stack",
  url: await resolveViewUrl()
});

routeExternalLinks(mainWindow);
