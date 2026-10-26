import { createFileRoute } from "@tanstack/react-router";

import { m } from "@tsu-stack/i18n/messages";

import { documentTitle } from "#/shared/lib/document-title";

import { TodosPage } from "#/pages/todos/index";

export const Route = createFileRoute("/(auth)/todos/")({
  head: () => {
    return { meta: [{ title: documentTitle(m.todos_page__title()) }] };
  },
  component: TodosPage
});
