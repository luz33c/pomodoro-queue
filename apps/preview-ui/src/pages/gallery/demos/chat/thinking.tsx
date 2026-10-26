import { useEffect, useState } from "react";

import { type ThinkingRow, type ThinkingVariant } from "@tsu-stack/ui/components/chat/thinking";
import { Thinking } from "@tsu-stack/ui/components/chat/thinking";

type Trace = {
  label: string;
  doneLabel: string;
  query?: string;
  footnote?: string;
  rows: ThinkingRow[];
};

const TRACES: Record<ThinkingVariant, Trace> = {
  coding: {
    doneLabel: "Ran 3 tools",
    label: "Running tools",
    rows: [
      { primary: "Read", secondary: "schema/page.ts" },
      { additions: 74, deletions: 41, primary: "Edit", secondary: "queries/page.ts" },
      { primary: "Run", secondary: "pnpm run check" }
    ]
  },
  reasoning: {
    doneLabel: "Thought for 4 seconds",
    label: "Thinking",
    rows: [
      { primary: "Three tasks are due Friday, so the plan should start with them." },
      { primary: "The design review blocks two of them, so it goes first on Monday." }
    ]
  },
  search: {
    doneLabel: "Searched the web",
    footnote: "+7 more",
    label: "Searching the web",
    query: "local-first sync engines",
    rows: [
      { href: "https://electric-sql.com", primary: "ElectricSQL", secondary: "electric-sql.com" },
      { href: "https://replicache.dev", primary: "Replicache", secondary: "replicache.dev" },
      { href: "https://yjs.dev", primary: "Yjs", secondary: "yjs.dev" }
    ]
  },
  steps: {
    doneLabel: "Thought for 4 seconds",
    label: "Thinking",
    rows: [
      { primary: "Reading the roadmap page" },
      { primary: "Scanning open tasks", secondary: "12 tasks" },
      { primary: "Comparing due dates" },
      { primary: "Drafting the weekly plan" }
    ]
  }
};

const BEAT_MS = 900;

/** Streams one row per beat, then marks the trace done. */
export function ThinkingDemo({ variant = "steps" }: { variant?: ThinkingVariant }) {
  const trace = TRACES[variant];
  const [visibleRows, setVisibleRows] = useState(1);
  const done = visibleRows > trace.rows.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setVisibleRows((count) => count + 1), BEAT_MS);
    return () => clearTimeout(timer);
  }, [done, visibleRows]);

  return (
    <Thinking
      variant={variant}
      status={done ? "done" : "running"}
      label={trace.label}
      doneLabel={trace.doneLabel}
      query={trace.query}
      footnote={trace.footnote}
      rows={trace.rows.slice(0, visibleRows)}
    />
  );
}
