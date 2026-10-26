import { createFileRoute } from "@tanstack/react-router";

import { DemoPage } from "#/pages/demo/index";

export const Route = createFileRoute("/demo/")({
  // A scripted, timer-driven run: render it in the browser only
  ssr: false,
  head: () => {
    return { meta: [{ title: "Demo · tsu-stack UI" }] };
  },
  component: DemoPage
});
