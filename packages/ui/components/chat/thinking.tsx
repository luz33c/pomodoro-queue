// Adapted from Beautiful UI (MIT); see packages/ui/THIRD_PARTY_NOTICES.md
import { Check, ChevronDown, Globe, Search, Sparkle } from "lucide-react";
import { useState } from "react";

import { Spinner } from "#/components/spinner";
import { cn } from "#/lib/utils";

export type ThinkingVariant = "steps" | "reasoning" | "search" | "coding";

export type ThinkingStatus = "running" | "done";

export type ThinkingRow = {
  /** Step name, reasoning sentence, source title, or tool name */
  primary: string;
  /** Source domain, file name, or command */
  secondary?: string;
  /** Lines a coding step added and removed */
  additions?: number;
  deletions?: number;
  /** Source URL in the search variant */
  href?: string;
};

export type ThinkingProps = Omit<React.ComponentProps<"div">, "children"> & {
  variant?: ThinkingVariant;
  status?: ThinkingStatus;
  /** Header text while running */
  label?: string;
  /** Header text once done */
  doneLabel?: string;
  /** Search query shown above the sources */
  query?: string;
  rows?: ThinkingRow[];
  /** Note under the rows once done, for example "+7 more" */
  footnote?: string;
  /** Replaces the sparkle in the header */
  icon?: React.ReactNode;
};

const SOURCE_TONES = ["bg-info", "bg-warning", "bg-success"];

// The success token is too light for text; mixing in the foreground keeps it readable in both themes
const ADDED_TEXT = "text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";

type TraceRowProps = {
  row: ThinkingRow;
  index: number;
  variant: ThinkingVariant;
  pending: boolean;
};

function TraceRow({ row, index, variant, pending }: TraceRowProps) {
  const hasDiff = row.additions !== undefined || row.deletions !== undefined;
  const className =
    "flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left animate-in duration-300 fade-in-0 slide-in-from-bottom-1";

  const content = (
    <>
      {variant === "search" && (
        <span
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center rounded-full text-white",
            SOURCE_TONES[index % SOURCE_TONES.length]
          )}
        >
          <Globe className="size-2.5" />
        </span>
      )}
      {variant === "steps" &&
        (pending ? (
          <Spinner size="xs" className="shrink-0 text-muted-foreground" />
        ) : (
          <Check className="size-3.5 shrink-0 text-muted-foreground" />
        ))}
      <span
        className={cn(
          "min-w-0 text-[12.5px]",
          variant === "reasoning"
            ? "leading-relaxed text-muted-foreground"
            : "truncate font-medium text-foreground",
          variant === "search" && "underline-offset-2 group-hover:underline"
        )}
      >
        {row.primary}
      </span>
      {row.secondary && (
        <span
          className={cn(
            "shrink-0 text-[11.5px] text-muted-foreground",
            variant === "coding" && "font-mono"
          )}
        >
          {row.secondary}
        </span>
      )}
      {hasDiff && (
        <span className="shrink-0 font-mono text-[11px] tabular-nums">
          <span className={ADDED_TEXT}>+{row.additions ?? 0}</span>{" "}
          <span className="text-destructive">−{row.deletions ?? 0}</span>
        </span>
      )}
    </>
  );

  if (variant === "search" && row.href) {
    return (
      <a
        href={row.href}
        target="_blank"
        rel="noreferrer"
        className={cn(className, "group transition-colors hover:bg-accent")}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

/**
 * An agent's trace: steps, reasoning, a web search, or tool calls.
 * Opens while running and closes once done; the header toggles it either way.
 * The caller streams `rows` and flips `status`.
 */
function Thinking({
  variant = "steps",
  status = "running",
  label = "Thinking",
  doneLabel = "Thought",
  query,
  rows = [],
  footnote,
  icon,
  className,
  ...props
}: ThinkingProps) {
  const [toggledOpen, setToggledOpen] = useState<boolean | null>(null);
  const running = status === "running";
  const open = toggledOpen ?? running;

  return (
    <div data-slot="thinking" className={cn("flex w-full max-w-95 flex-col", className)} {...props}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setToggledOpen(!open)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-100 hover:bg-accent"
      >
        <span
          className={cn(
            "flex shrink-0 transition-colors duration-200 [&_svg:not([class*='size-'])]:size-4",
            running ? "text-foreground/80" : "text-muted-foreground"
          )}
        >
          {icon ?? <Sparkle className="fill-current" />}
        </span>
        <output
          className={cn(
            "text-[13px] font-medium whitespace-nowrap",
            running
              ? "text-shimmer motion-safe:animate-shimmer-text"
              : "animate-in text-muted-foreground fade-in-0"
          )}
        >
          {running ? label : doneLabel}
        </output>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-[7px] flex flex-col gap-1 border-l py-1 pl-3.5">
            {query && (
              <div className="flex h-6 items-center gap-2 px-1.5">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-[12.5px] text-muted-foreground">{query}</span>
              </div>
            )}
            {rows.map((row, index) => (
              <TraceRow
                key={`${index}-${row.primary}`}
                row={row}
                index={index}
                variant={variant}
                pending={running && index === rows.length - 1}
              />
            ))}
            {footnote && !running && (
              <span className="animate-in px-1.5 text-xs text-muted-foreground fade-in-0">
                {footnote}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Thinking };
