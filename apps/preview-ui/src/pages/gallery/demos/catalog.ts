// A `?raw` import's default export is the file's text, added by Vite; the import plugin only sees the module's own exports
/* oxlint-disable import/default */
import { type ComponentType } from "react";

import loadingStateSource from "@tsu-stack/ui/components/chat/loading-state?raw";
import thinkingSource from "@tsu-stack/ui/components/chat/thinking?raw";
import toolChipsSource from "@tsu-stack/ui/components/chat/tool-chips?raw";

import { LoadingStateDemo } from "./chat/loading-state";
import loadingStateUsage from "./chat/loading-state.tsx?raw";
import { ThinkingDemo } from "./chat/thinking";
import thinkingUsage from "./chat/thinking.tsx?raw";
import { ToolChipsDemo } from "./chat/tool-chips";
import toolChipsUsage from "./chat/tool-chips.tsx?raw";

export type DemoEntry = {
  /** Anchor id and React key */
  id: string;
  title: string;
  caption: string;
  /** Named export consumers import */
  exportName: string;
  /** Specifier consumers import it from */
  importPath: string;
  /** Values passed to the demo's `variant` prop; the first is the default */
  variants?: readonly string[];
  Demo: ComponentType<{ variant?: string }>;
  /** The demo's own source, shown as the usage example */
  usage: string;
  source: {
    path: string;
    code: string;
  };
};

/** One folder of composite components under packages/ui/components */
export type DemoCategory = {
  id: string;
  title: string;
  entries: DemoEntry[];
};

/** Rejects variants the demo's `variant` prop does not accept */
function defineDemo<V extends string>(
  entry: Omit<DemoEntry, "Demo" | "variants"> & {
    Demo: ComponentType<{ variant?: V }>;
    variants?: readonly V[];
  }
): DemoEntry {
  return { ...entry, Demo: entry.Demo as DemoEntry["Demo"] };
}

export const catalog: DemoCategory[] = [
  {
    entries: [
      defineDemo({
        Demo: LoadingStateDemo,
        caption: "Pixel-grid loader with a shimmering label and elapsed time.",
        exportName: "LoadingState",
        id: "loading-state",
        importPath: "@tsu-stack/ui/components/chat/loading-state",
        source: { code: loadingStateSource, path: "packages/ui/components/chat/loading-state.tsx" },
        title: "Loading State",
        usage: loadingStateUsage,
        variants: ["drive", "dots", "orbit"]
      }),
      defineDemo({
        Demo: ThinkingDemo,
        caption: "Expandable trace: steps, reasoning, search, or tool calls.",
        exportName: "Thinking",
        id: "thinking",
        importPath: "@tsu-stack/ui/components/chat/thinking",
        source: { code: thinkingSource, path: "packages/ui/components/chat/thinking.tsx" },
        title: "Thinking",
        usage: thinkingUsage,
        variants: ["steps", "reasoning", "search", "coding"]
      }),
      defineDemo({
        Demo: ToolChipsDemo,
        caption: "Tool calls as compact rows; file chips preview their diffs.",
        exportName: "ToolChips",
        id: "tool-chips",
        importPath: "@tsu-stack/ui/components/chat/tool-chips",
        source: { code: toolChipsSource, path: "packages/ui/components/chat/tool-chips.tsx" },
        title: "Tool Chips",
        usage: toolChipsUsage
      })
    ],
    id: "chat",
    title: "Chat"
  }
];
