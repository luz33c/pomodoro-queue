import { createFileRoute } from "@tanstack/react-router";

import { m } from "@tsu-stack/i18n/messages";

import { documentTitle } from "#/shared/lib/document-title";

import { DashboardPage } from "#/pages/dashboard/index";

export const Route = createFileRoute("/(auth)/dashboard/")({
  head: () => {
    return { meta: [{ title: documentTitle(m.dashboard_page__title()) }] };
  },
  component: DashboardPage
});
