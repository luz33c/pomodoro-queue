// Adapted from Beautiful UI (MIT); see packages/ui/THIRD_PARTY_NOTICES.md
import { ChevronDown, FileText, PenLine, Sparkle, Terminal } from "lucide-react";
import { useState } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "#/components/hover-card";
import { cn } from "#/lib/utils";

export type ToolCallKind = "think" | "read" | "write" | "run";

export type ToolCallDetail = {
  text: string;
  tone?: "add";
};

export type ToolCall = {
  id: string;
  kind: ToolCallKind;
  label: string;
  /** Subject shown in the chip: a summary, a file, or a command */
  chip: string;
  /** Lines shown when the row is expanded */
  details?: ToolCallDetail[];
};

export type FileDiffLine = {
  text: string;
  tone: "add" | "del" | "context";
};

export type FileDiff = {
  file: string;
  additions: number;
  deletions: number;
  /** Lines previewed when the file chip is hovered or focused */
  lines?: FileDiffLine[];
};

export type ToolChipsProps = Omit<React.ComponentProps<"div">, "children"> & {
  calls: ToolCall[];
  /** File chips under the calls */
  diffs?: FileDiff[];
  /** Header text; defaults to the number of calls */
  header?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCallToggle?: (id: string, open: boolean) => void;
};

const KIND_ICONS: Record<ToolCallKind, typeof FileText> = {
  read: FileText,
  run: Terminal,
  think: Sparkle,
  write: PenLine
};

// The success token is too light for text; mixing in the foreground keeps it readable in both themes
const ADDED_TEXT = "text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";

type CallRowProps = {
  call: ToolCall;
  open: boolean;
  onToggle: () => void;
};

function CallRow({ call, open, onToggle }: CallRowProps) {
  const Icon = KIND_ICONS[call.kind];
  // Files and commands read best in mono; a thinking summary is prose
  const monoChip = call.kind !== "think";
  const monoDetails = call.kind === "write" || call.kind === "run";

  return (
    <div className="animate-in duration-300 fade-in-0 slide-in-from-bottom-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-md px-[3px] text-left transition-colors duration-100 hover:bg-accent"
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          <Icon
            className={cn(
              "size-3.5 transition-opacity duration-100 group-hover/row:opacity-0",
              call.kind === "think" && "fill-current",
              open && "opacity-0"
            )}
          />
          <ChevronDown
            className={cn(
              "absolute size-3 transition-[opacity,transform] duration-150 group-hover/row:opacity-100",
              open ? "opacity-100" : "-rotate-90 opacity-0"
            )}
          />
        </span>
        <span className="shrink-0 text-[12.5px] font-medium text-foreground">{call.label}</span>
        <span
          className={cn(
            "block h-5.5 min-w-0 flex-1 truncate rounded-sm bg-muted px-1.5 text-[11.5px]/5.5 text-muted-foreground ring-1 ring-border",
            monoChip && "font-mono"
          )}
        >
          {call.chip}
        </span>
      </button>

      <div
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l py-0.5 pl-3.5">
            {call.details?.map((line, index) => (
              <span
                key={`${index}-${line.text}`}
                className={cn(
                  "truncate text-[11.5px] leading-[1.6]",
                  monoDetails && "font-mono",
                  line.tone === "add" ? ADDED_TEXT : "text-muted-foreground"
                )}
              >
                {line.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffChip({ diff, index }: { diff: FileDiff; index: number }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={100}
        closeDelay={100}
        // The trigger fills the button with the file name and line counts, which name it
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label
        render={<button type="button" />}
        className="inline-flex h-7 max-w-full animate-in items-center gap-2 rounded-sm bg-background px-2 font-mono text-[11.5px] text-foreground shadow-xs ring-1 ring-border transition-colors duration-100 fade-in-0 fill-mode-both zoom-in-95 hover:bg-accent"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <span className="min-w-0 truncate">{diff.file}</span>
        <span className={cn("shrink-0 tabular-nums", ADDED_TEXT)}>+{diff.additions}</span>
        {diff.deletions > 0 && (
          <span className="shrink-0 text-destructive tabular-nums">−{diff.deletions}</span>
        )}
      </HoverCardTrigger>
      {diff.lines && diff.lines.length > 0 && (
        <HoverCardContent align="start" className="w-72 overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5 font-mono text-[11px]">
            <span className="min-w-0 truncate text-muted-foreground">{diff.file}</span>
            <span className="shrink-0 tabular-nums">
              <span className={ADDED_TEXT}>+{diff.additions}</span>
              {diff.deletions > 0 && <span className="text-destructive"> −{diff.deletions}</span>}
            </span>
          </div>
          <div className="py-1 font-mono text-[11px] leading-[1.8]">
            {diff.lines.map((line, lineIndex) => (
              <div
                key={`${lineIndex}-${line.text}`}
                className={cn(
                  "flex gap-2 px-2.5 whitespace-pre",
                  line.tone === "add" && `bg-success/15 ${ADDED_TEXT}`,
                  line.tone === "del" && "bg-destructive/10 text-destructive",
                  line.tone === "context" && "text-muted-foreground"
                )}
              >
                <span className="w-3 shrink-0 select-none">
                  {line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 truncate">{line.text}</span>
              </div>
            ))}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

/**
 * An agent run as compact rows: each tool call expands to show what it did,
 * and file chips preview their diffs on hover or focus.
 * The caller streams `calls` and adds `diffs` when the run finishes.
 */
function ToolChips({
  calls,
  diffs = [],
  header,
  defaultOpen = true,
  onOpenChange,
  onCallToggle,
  className,
  ...props
}: ToolChipsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [openCallIds, setOpenCallIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleCall = (id: string) => {
    const next = new Set(openCallIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setOpenCallIds(next);
    onCallToggle?.(id, next.has(id));
  };

  return (
    <div data-slot="tool-chips" className={cn("w-full max-w-80 pb-1", className)} {...props}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onOpenChange?.(!open);
        }}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors duration-100 hover:bg-accent"
      >
        <ChevronDown
          className={cn("size-3 transition-transform duration-200", !open && "-rotate-90")}
        />
        <span className="tabular-nums">{header ?? `${calls.length} tool calls`}</span>
      </button>

      <div
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        {/* The negative margin gives the row hover background room inside this clipping box */}
        <div className="-mx-1 overflow-hidden px-1.5 pb-1">
          <div className="mt-1.5 flex flex-col gap-1">
            {calls.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                open={openCallIds.has(call.id)}
                onToggle={() => toggleCall(call.id)}
              />
            ))}
          </div>

          {diffs.length > 0 && (
            <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t pt-2.5">
              {diffs.map((diff, index) => (
                <DiffChip key={diff.file} diff={diff} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ToolChips };
