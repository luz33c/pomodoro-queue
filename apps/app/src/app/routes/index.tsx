import { createFileRoute, redirect } from "@tanstack/react-router";

import { appConfig } from "#/config/app";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ replace: true, to: appConfig.homePath });
  }
});
