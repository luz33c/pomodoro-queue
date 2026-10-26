// Adapted from Beautiful UI (MIT); see packages/ui/THIRD_PARTY_NOTICES.md
import { useEffect, useState } from "react";

import { cn } from "#/lib/utils";

export type LoadingStateVariant = "drive" | "dots" | "orbit";

type LoaderPattern = {
  /** Animation delay in ms for each cell of the 3×3 grid; `null` keeps the cell dim */
  delays: (number | null)[];
  durationMs: number;
  round: boolean;
};

// A chevron wavefront moving right; the cycle is shorter than the sweep, so two fronts overlap
const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

// A comet lapping the grid's outer ring; the center cell stays dim
const ORBIT_RING = [0, 1, 2, 5, 8, 7, 6, 3];
const ORBIT_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const position = ORBIT_RING.indexOf(index);
  return position === -1 ? null : position * 110;
});

const PATTERNS: Record<LoadingStateVariant, LoaderPattern> = {
  dots: { delays: CHEVRON_DELAYS, durationMs: 650, round: true },
  drive: { delays: CHEVRON_DELAYS, durationMs: 650, round: false },
  orbit: { delays: ORBIT_DELAYS, durationMs: 950, round: false }
};

function formatElapsed(tenths: number) {
  const seconds = tenths / 10;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

/** Time since mount, in tenths of a second */
function useElapsedTenths() {
  const [tenths, setTenths] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTenths((current) => current + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return tenths;
}

export type LoadingStateProps = Omit<React.ComponentProps<"output">, "children"> & {
  label?: string;
  variant?: LoadingStateVariant;
};

/** Pixel-grid loader with a shimmering label and the time elapsed since it appeared. */
function LoadingState({
  label = "Working",
  variant = "drive",
  className,
  ...props
}: LoadingStateProps) {
  const elapsed = formatElapsed(useElapsedTenths());
  const { delays, durationMs, round } = PATTERNS[variant];

  return (
    // <output> is a polite live region, so screen readers announce label changes
    <output
      data-slot="loading-state"
      className={cn("flex w-fit items-center gap-2.5", className)}
      {...props}
    >
      <span aria-hidden="true" className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((delay, index) => (
          <span
            key={index}
            className={cn(
              "size-1 bg-foreground",
              round ? "rounded-full" : "rounded-[1px]",
              delay === null ? "opacity-[0.07]" : "opacity-15 motion-safe:animate-pixel-on"
            )}
            style={
              delay === null
                ? undefined
                : { animationDelay: `${delay}ms`, animationDuration: `${durationMs}ms` }
            }
          />
        ))}
      </span>
      <span className="text-shimmer text-[13px] font-medium motion-safe:animate-shimmer-text">
        {label}
      </span>
      {/* Hidden from screen readers, which would otherwise announce every tick */}
      <span aria-hidden="true" className="font-mono text-xs text-muted-foreground tabular-nums">
        {elapsed}
      </span>
    </output>
  );
}

export { LoadingState };
