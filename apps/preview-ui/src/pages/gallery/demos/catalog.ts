// A `?raw` import's default export is the file's text, added by Vite; the import plugin only sees the module's own exports
/* oxlint-disable import/default */
import { type ComponentType } from "react";

import loadingStateSource from "@tsu-stack/ui/components/chat/loading-state?raw";
import thinkingSource from "@tsu-stack/ui/components/chat/thinking?raw";
import toolChipsSource from "@tsu-stack/ui/components/chat/tool-chips?raw";
import compactCardSource from "@tsu-stack/ui/components/shadowing/compact-card?raw";
import playerCardSource from "@tsu-stack/ui/components/shadowing/player-card?raw";
import hintSource from "@tsu-stack/ui/components/word-input/hint?raw";
import meaningChoiceSource from "@tsu-stack/ui/components/word-input/meaning-choice?raw";
import recallSource from "@tsu-stack/ui/components/word-input/recall?raw";
import traceSource from "@tsu-stack/ui/components/word-input/trace?raw";
import wordChoiceSource from "@tsu-stack/ui/components/word-input/word-choice?raw";

import { LoadingStateDemo } from "./chat/loading-state";
import loadingStateUsage from "./chat/loading-state.tsx?raw";
import { ThinkingDemo } from "./chat/thinking";
import thinkingUsage from "./chat/thinking.tsx?raw";
import { ToolChipsDemo } from "./chat/tool-chips";
import toolChipsUsage from "./chat/tool-chips.tsx?raw";
import { ShadowingCompactCardDemo } from "./shadowing/compact-card";
import compactCardUsage from "./shadowing/compact-card.tsx?raw";
import { ShadowingPlayerCardDemo } from "./shadowing/player-card";
import playerCardUsage from "./shadowing/player-card.tsx?raw";
import { HintInputDemo } from "./word-input/hint";
import hintUsage from "./word-input/hint.tsx?raw";
import { MeaningChoiceInputDemo } from "./word-input/meaning-choice";
import meaningChoiceUsage from "./word-input/meaning-choice.tsx?raw";
import { RecallInputDemo } from "./word-input/recall";
import recallUsage from "./word-input/recall.tsx?raw";
import { TraceInputDemo } from "./word-input/trace";
import traceUsage from "./word-input/trace.tsx?raw";
import { WordChoiceInputDemo } from "./word-input/word-choice";
import wordChoiceUsage from "./word-input/word-choice.tsx?raw";

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
  },
  {
    entries: [
      defineDemo({
        Demo: TraceInputDemo,
        caption: "Type over a ghosted word; a wrong key shakes and rolls back.",
        exportName: "TraceInput",
        id: "trace-input",
        importPath: "@tsu-stack/ui/components/word-input/trace",
        source: { code: traceSource, path: "packages/ui/components/word-input/trace.tsx" },
        title: "Trace Input",
        usage: traceUsage
      }),
      defineDemo({
        Demo: RecallInputDemo,
        caption: "Type the word from memory; a failed check clears it and shows the answer.",
        exportName: "RecallInput",
        id: "recall-input",
        importPath: "@tsu-stack/ui/components/word-input/recall",
        source: { code: recallSource, path: "packages/ui/components/word-input/recall.tsx" },
        title: "Recall Input",
        usage: recallUsage
      }),
      defineDemo({
        Demo: HintInputDemo,
        caption: "One cell per letter, each checked as you type.",
        exportName: "HintInput",
        id: "hint-input",
        importPath: "@tsu-stack/ui/components/word-input/hint",
        source: { code: hintSource, path: "packages/ui/components/word-input/hint.tsx" },
        title: "Hint Input",
        usage: hintUsage
      }),
      defineDemo({
        Demo: WordChoiceInputDemo,
        caption: "A blank slot opens four candidate words; pick with 1–4.",
        exportName: "WordChoiceInput",
        id: "word-choice",
        importPath: "@tsu-stack/ui/components/word-input/word-choice",
        source: {
          code: wordChoiceSource,
          path: "packages/ui/components/word-input/word-choice.tsx"
        },
        title: "Word Choice",
        usage: wordChoiceUsage
      }),
      defineDemo({
        Demo: MeaningChoiceInputDemo,
        caption: "Pick what the highlighted word means in this sentence.",
        exportName: "MeaningChoiceInput",
        id: "meaning-choice",
        importPath: "@tsu-stack/ui/components/word-input/meaning-choice",
        source: {
          code: meaningChoiceSource,
          path: "packages/ui/components/word-input/meaning-choice.tsx"
        },
        title: "Meaning Choice",
        usage: meaningChoiceUsage
      })
    ],
    id: "word-input",
    title: "Word Input"
  },
  {
    entries: [
      defineDemo({
        Demo: ShadowingCompactCardDemo,
        caption: "Speaker before the sentence, one split button to shadow or repeat.",
        exportName: "ShadowingCompactCard",
        id: "shadowing-compact-card",
        importPath: "@tsu-stack/ui/components/shadowing/compact-card",
        source: {
          code: compactCardSource,
          path: "packages/ui/components/shadowing/compact-card.tsx"
        },
        title: "Compact Card",
        usage: compactCardUsage
      }),
      defineDemo({
        Demo: ShadowingPlayerCardDemo,
        caption: "Player-style round buttons: listen, shadow, then repeat.",
        exportName: "ShadowingPlayerCard",
        id: "shadowing-player-card",
        importPath: "@tsu-stack/ui/components/shadowing/player-card",
        source: {
          code: playerCardSource,
          path: "packages/ui/components/shadowing/player-card.tsx"
        },
        title: "Player Card",
        usage: playerCardUsage
      })
    ],
    id: "shadowing",
    title: "Shadowing"
  }
];
