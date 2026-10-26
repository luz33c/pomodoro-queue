import { type Transaction, useLiveQuery } from "@tanstack/react-db";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@tsu-stack/i18n/messages";
import { Button } from "@tsu-stack/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "#/shared/ui/container";

import { deleteTodo, insertTodo, setTodoCompleted, todoCollection } from "#/entities/todo/index";

/** Changes apply optimistically; a rejected write rolls back on its own, so only tell the user. */
function reportFailure(transaction: Transaction) {
  transaction.isPersisted.promise.catch(() => {
    toast.error(m.todos_page__save_failed());
  });
}

export function TodosPage() {
  const [title, setTitle] = useState("");
  const { data: todos, isLoading } = useLiveQuery((q) =>
    q.from({ todo: todoCollection }).orderBy(({ todo }) => todo.createdAt, "asc")
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    reportFailure(insertTodo(trimmed));
    setTitle("");
  }

  return (
    <Container className="max-w-2xl">
      <h2 className="font-display mb-6 text-4xl">{m.todos_page__title()}</h2>

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
                    reportFailure(setTodoCompleted(todo.id, event.target.checked))
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
                onClick={() => reportFailure(deleteTodo(todo.id))}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
