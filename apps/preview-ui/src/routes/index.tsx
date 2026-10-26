import { createFileRoute } from "@tanstack/react-router";

import { GalleryPage } from "#/pages/gallery/index";

export const Route = createFileRoute("/")({
  head: () => {
    return { meta: [{ title: "Components · tsu-stack UI" }] };
  },
  component: GalleryPage
});
