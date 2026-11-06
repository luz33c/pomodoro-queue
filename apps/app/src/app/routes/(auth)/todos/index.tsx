import { createFileRoute } from "@tanstack/react-router";

import { m } from "@uni-stack/i18n/messages";

import { documentTitle } from "#/lib/document-title";

import { TodosPage } from "#/features/todos/index";

export const Route = createFileRoute("/(auth)/todos/")({
  head: () => {
    return { meta: [{ title: documentTitle(m.todos_page__title()) }] };
  },
  component: TodosPage
});
