import { useEffect, useState } from "react";

import { type FileDiff, type ToolCall } from "@uni-stack/ui/components/chat/tool-chips";
import { ToolChips } from "@uni-stack/ui/components/chat/tool-chips";

const CALLS: ToolCall[] = [
  {
    chip: "Planning the page schema…",
    details: [
      { text: "Pages nest, so each row keeps a parent id." },
      { text: "Sibling order needs a sortable position." }
    ],
    id: "plan",
    kind: "think",
    label: "Thinking"
  },
  {
    chip: "schema/page.ts",
    details: [
      { text: "+ parentId: uuid().references(() => page.id)", tone: "add" },
      { text: "+ position: text().notNull()", tone: "add" }
    ],
    id: "schema",
    kind: "write",
    label: "Write 48 lines"
  },
  {
    chip: "pnpm run db:generate",
    details: [{ text: "✓ 1 migration created" }, { text: "✓ 0 conflicts" }],
    id: "migrate",
    kind: "run",
    label: "Generate migration"
  },
  {
    chip: "queries/page.ts",
    details: [{ text: "getPageTree() loads one workspace at a time." }],
    id: "queries",
    kind: "read",
    label: "Read file"
  }
];

const DIFFS: FileDiff[] = [
  {
    additions: 48,
    deletions: 0,
    file: "schema/page.ts",
    lines: [
      { text: 'export const page = pgTable("page", {', tone: "context" },
      { text: "  parentId: uuid().references(() => page.id),", tone: "add" },
      { text: "  position: text().notNull(),", tone: "add" },
      { text: "});", tone: "context" }
    ]
  },
  {
    additions: 12,
    deletions: 3,
    file: "queries/page.ts",
    lines: [
      { text: "const rows = await db.select().from(page);", tone: "del" },
      { text: "const rows = await db.select().from(page)", tone: "add" },
      { text: "  .where(eq(page.workspaceId, workspaceId));", tone: "add" }
    ]
  }
];

const BEAT_MS = 700;

/** Streams one call per beat; the file chips arrive when the run finishes. */
export function ToolChipsDemo() {
  const [visibleCalls, setVisibleCalls] = useState(1);
  const done = visibleCalls > CALLS.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setVisibleCalls((count) => count + 1), BEAT_MS);
    return () => clearTimeout(timer);
  }, [done, visibleCalls]);

  return (
    <ToolChips
      calls={CALLS.slice(0, visibleCalls)}
      diffs={done ? DIFFS : []}
      header={`${CALLS.length} tool calls`}
    />
  );
}
