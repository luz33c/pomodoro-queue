import { type Transaction, useLiveQuery } from "@tanstack/react-db";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@uni-stack/i18n/messages";
import { Button } from "@uni-stack/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@uni-stack/ui/components/empty";
import { Input } from "@uni-stack/ui/components/input";
import { Spinner } from "@uni-stack/ui/components/spinner";
import { cn } from "@uni-stack/ui/lib/utils";

import { Container } from "#/components/container";

import { deleteTodo, insertTodo, setTodoCompleted } from "#/features/todos/api/todo-mutations";
import {
  todoDeviceCollection,
  type TodoSource,
  useTodoSource
} from "#/features/todos/api/todo-source";

import { ImportLocalTodosBanner } from "./import-local-todos-banner";

/** Changes apply optimistically; a rejected write rolls back on its own, so only tell the user. */
function reportFailure(transaction: Transaction) {
  transaction.when("settled").catch(() => {
    toast.error(m.todos_page__save_failed());
  });
}

export function TodosPage() {
  const source = useTodoSource();

  return (
    <Container className="max-w-2xl">
      <h2 className="font-display mb-6 text-4xl">{m.todos_page__title()}</h2>
      {source ? (
        // A new collection means new rows, so the list remounts instead of carrying state across
        <TodoList key={source.collection.id} source={source} />
      ) : (
        <Spinner className="mx-auto my-16" />
      )}
    </Container>
  );
}

function scopeLabel({ scope }: TodoSource, offline: boolean) {
  if (scope === "device") {
    return m.todos_page__scope_device();
  }
  return offline ? m.todos_page__scope_offline() : m.todos_page__scope_account();
}

function TodoList({ source }: { source: TodoSource }) {
  const { collection, scope } = source;
  const [title, setTitle] = useState("");
  const {
    data: todos,
    isLoading,
    isSyncError
  } = useLiveQuery((q) =>
    q.from({ todo: collection }).orderBy(({ todo }) => todo.createdAt, "asc")
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    reportFailure(insertTodo(collection, trimmed));
    setTitle("");
  }

  return (
    <>
      {/* Only a device that can keep todos of its own says where these live */}
      {todoDeviceCollection && (
        <p className="-mt-4 mb-6 text-sm text-muted-foreground">
          {scopeLabel(source, isSyncError)}
        </p>
      )}

      {scope === "account" && todoDeviceCollection && (
        <ImportLocalTodosBanner account={collection} device={todoDeviceCollection} />
      )}

      <form className="mb-6 flex gap-2" onSubmit={handleSubmit}>
        <Input
          aria-label={m.todos_page__new_todo_label()}
          maxLength={500}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={m.todos_page__new_todo_placeholder()}
          value={title}
        />
        <Button disabled={!title.trim()} type="submit">
          {m.todos_page__add()}
        </Button>
      </form>

      {isLoading ? (
        <Spinner className="mx-auto my-16" />
      ) : todos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{m.todos_page__empty_title()}</EmptyTitle>
            <EmptyDescription>{m.todos_page__empty_description()}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border">
          {todos.map((todo) => (
            <li className="flex items-center gap-3 px-4 py-2" key={todo.id}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  checked={todo.completed}
                  className="size-4 shrink-0 accent-primary"
                  onChange={(event) =>
                    reportFailure(setTodoCompleted(collection, todo.id, event.target.checked))
                  }
                  type="checkbox"
                />
                <span
                  className={cn("truncate", todo.completed && "text-muted-foreground line-through")}
                >
                  {todo.title}
                </span>
              </label>
              <Button
                aria-label={m.todos_page__delete({ title: todo.title })}
                onClick={() => reportFailure(deleteTodo(collection, todo.id))}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
