import { type ThinkingRow } from "@uni-stack/ui/components/chat/thinking";
import { type FileDiff, type ToolCall } from "@uni-stack/ui/components/chat/tool-chips";

export const FIRST_PROMPT = "Add nested pages to the workspace sidebar.";

const THINKING_ROWS: ThinkingRow[] = [
  { primary: "Reading the sidebar page" },
  { primary: "Checking the page schema", secondary: "packages/db" },
  { primary: "Planning the migration" }
];

export const TOOL_CALLS: ToolCall[] = [
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
    details: [{ text: "✓ 1 migration created" }],
    id: "migrate",
    kind: "run",
    label: "Generate migration"
  },
  {
    chip: "queries/page.ts",
    details: [{ text: "getPageTree() now returns children under their parent." }],
    id: "queries",
    kind: "write",
    label: "Write 12 lines"
  }
];

const FILE_DIFFS: FileDiff[] = [
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
      { text: "return rows;", tone: "del" },
      { text: "return nestPages(rows);", tone: "add" }
    ]
  }
];

const ANSWER =
  "Pages now keep a parent and a position, and the sidebar query returns them as a tree. Run the migration, then drag a page onto another to nest it.";

/**
 * How long each beat lasts, in ms. Beat 0 is the loader, beats 1-3 stream the thinking rows,
 * beats 4-6 stream the tool calls, beat 7 shows the file chips, and the run then holds the answer.
 */
export const BEAT_DURATIONS_MS = [1600, 800, 800, 1000, 700, 700, 800, 700];

/** What the run shows at a given beat */
export function describeRun(beat: number) {
  const thinkingDone = beat > THINKING_ROWS.length;
  const callBeats = Math.max(0, beat - THINKING_ROWS.length);

  return {
    answer: beat >= BEAT_DURATIONS_MS.length ? ANSWER : null,
    calls: TOOL_CALLS.slice(0, callBeats),
    diffs: callBeats > TOOL_CALLS.length ? FILE_DIFFS : [],
    loading: beat === 0,
    thinkingRows: THINKING_ROWS.slice(0, beat),
    thinkingStatus: thinkingDone ? ("done" as const) : ("running" as const)
  };
}
