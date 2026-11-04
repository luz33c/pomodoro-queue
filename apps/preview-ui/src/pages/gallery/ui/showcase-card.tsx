import { Check, Code2, Copy, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@uni-stack/ui/components/button";

import { SegmentedControl } from "#/shared/ui/segmented-control";

import { type DemoEntry } from "#/pages/gallery/demos/catalog";
import { useCopy } from "#/pages/gallery/hooks/use-copy";

import { CodeSheet } from "./code-sheet";

/**
 * Tallest height the observed element has reached; it never shrinks, so switching variants does not move the page.
 * Returns the height and a callback ref for the element.
 */
function useTallestHeight() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([record]) => {
      if (record) setHeight((current) => Math.max(current, Math.ceil(record.contentRect.height)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [height, setElement] as const;
}

type ShowcaseCardProps = {
  entry: DemoEntry;
  number: number;
};

export function ShowcaseCard({ entry, number }: ShowcaseCardProps) {
  const { Demo, variants } = entry;
  const [variant, setVariant] = useState(variants?.[0]);
  // Bumping it remounts the demo, which restarts its playback
  const [replay, setReplay] = useState(0);
  const [codeOpen, setCodeOpen] = useState(false);
  const { copied, copy } = useCopy();
  const [stageHeight, stageRef] = useTallestHeight();
  const importLine = `import { ${entry.exportName} } from "${entry.importPath}";`;

  return (
    <section
      id={entry.id}
      aria-labelledby={`${entry.id}-title`}
      className="group scroll-mt-8 border-b border-dashed px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {String(number).padStart(2, "0")}
        </span>
        <h2 id={`${entry.id}-title`} className="text-[13px] font-semibold whitespace-nowrap">
          {entry.title}
        </h2>
        <p className="min-w-0 truncate text-[12.5px] text-muted-foreground">{entry.caption}</p>
      </div>

      <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/50 px-4 pt-10 pb-16 ring-1 ring-border">
        <div
          className="flex w-full items-center justify-center"
          style={{ minHeight: stageHeight || undefined }}
        >
          <div ref={stageRef} className="flex w-full max-w-120 justify-center">
            <Demo key={`${variant}-${replay}`} variant={variant} />
          </div>
        </div>

        {variants && variant && (
          <SegmentedControl
            label={`${entry.title} variants`}
            options={variants}
            value={variant}
            onValueChange={setVariant}
            className="absolute bottom-3 left-1/2 -translate-x-1/2"
          />
        )}

        <div className="absolute top-3 right-3 flex gap-1 transition-opacity duration-150 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Replay ${entry.title}`}
            onClick={() => setReplay((count) => count + 1)}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Copy the ${entry.title} import`}
            onClick={() => void copy(importLine)}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`View the ${entry.title} code`}
            onClick={() => setCodeOpen(true)}
          >
            <Code2 />
          </Button>
        </div>
      </div>

      <CodeSheet entry={entry} open={codeOpen} onOpenChange={setCodeOpen} />
    </section>
  );
}
