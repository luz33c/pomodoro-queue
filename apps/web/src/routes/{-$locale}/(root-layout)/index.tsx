import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "#/config/app.config";
import { generateAppSeo } from "#/shared/lib/seo";

import { HomePage } from "#/pages/home/index";

export const Route = createFileRoute("/{-$locale}/(root-layout)/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/",
        locale: params.locale
      },
      description: appConfig.site.description
    }),
  component: HomePage
});
