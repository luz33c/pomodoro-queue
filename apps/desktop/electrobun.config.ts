import { type ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "TSU Stack",
    // Temporary identifier; the real reverse-DNS value is still pending.
    identifier: "dev.tsu-stack.desktop.spike",
    version: "0.0.0"
  },
  runtime: {
    exitOnLastWindowClosed: true
  },
  build: {
    mainProcess: "bun",
    bun: {
      entrypoint: "src/bun/index.ts"
    },
    views: {
      // The main window's preload: exposes window.tsuDesktop to apps/app
      "webview-bridge": {
        entrypoint: "src/bun/webview-bridge.ts"
      }
    },
    copy: {
      "../app/dist/desktop": "views/mainview"
    },
    watchIgnore: ["../app/dist/**"]
  }
} satisfies ElectrobunConfig;
