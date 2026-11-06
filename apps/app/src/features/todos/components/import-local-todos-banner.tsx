import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@uni-stack/i18n/messages";
import { Button } from "@uni-stack/ui/components/button";

import { type TodoCollection } from "#/features/todos/api/todo-source";
import { importLocalTodos } from "#/features/todos/utils/import-local-todos";

type ImportLocalTodosBannerProps = {
  /** The signed-in account's todos. */
  account: TodoCollection;
  /** Todos kept on this device before sign-in. */
  device: TodoCollection;
};

/**
 * Offers to move this device's todos into the account. Rows written before sign-in have no owner and
 * may not be this user's, so they move only on request. "Later" hides the offer until the next launch.
 */
export function ImportLocalTodosBanner({ account, device }: ImportLocalTodosBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: deviceTodos } = useLiveQuery((q) => q.from({ todo: device }));
  const count = deviceTodos.length;

  if (dismissed || count === 0) {
    return null;
  }

  async function handleUpload() {
    setUploading(true);
    let remaining: number;
    try {
      remaining = await importLocalTodos(device, account);
    } catch {
      remaining = count;
    } finally {
      setUploading(false);
    }
    if (remaining > 0) {
      toast.error(m.import_local_todos__failed({ count: remaining }));
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-muted px-4 py-3 text-sm">
      <p className="min-w-0 flex-1">{m.import_local_todos__message({ count })}</p>
      <Button disabled={uploading} onClick={() => void handleUpload()} size="sm">
        {m.import_local_todos__upload()}
      </Button>
      <Button disabled={uploading} onClick={() => setDismissed(true)} size="sm" variant="ghost">
        {m.import_local_todos__later()}
      </Button>
    </div>
  );
}
