import { createFileRoute } from "@tanstack/react-router";

import { PracticePage } from "#/pages/practice/index";

export const Route = createFileRoute("/demo/practice")({
  // Timer-driven playback and recording: render it in the browser only
  ssr: false,
  head: () => {
    return { meta: [{ title: "Practice · tsu-stack UI" }] };
  },
  component: PracticePage
});
