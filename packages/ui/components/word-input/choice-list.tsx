import { useRef, useState } from "react";

import { useShake } from "#/hooks/use-shake";
import { cn } from "#/lib/utils";

/** One answered choice question; wrong picks are allowed until the right one */
export type ChoiceAttempt = {
  /** Right on the first pick */
  correct: boolean;
  /** Picks it took to reach the answer */
  tries: number;
  /** From the first time the candidates opened to the right pick */
  ms: number;
  wrongPicks: string[];
};

export type ChoiceSlotKind = "word" | "meaning";

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Checks picks against the answer: a wrong pick shakes the slot and is struck out, the right one ends the attempt.
 * Call `markStart` when the candidates open; timing starts on the first call.
 */
export function useChoiceAttempt(answer: string, onResult?: (attempt: ChoiceAttempt) => void) {
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [shaking, shake] = useShake();
  const startedAt = useRef<number | null>(null);

  const markStart = () => {
    startedAt.current ??= performance.now();
  };

  const pick = (value: string) => {
    if (done || wrongPicks.includes(value)) return false;
    if (normalize(value) !== normalize(answer)) {
      setWrongPicks([...wrongPicks, value]);
      shake();
      return false;
    }
    const now = performance.now();
    setDone(true);
    onResult?.({
      correct: wrongPicks.length === 0,
      ms: Math.round(now - (startedAt.current ?? now)),
      tries: wrongPicks.length + 1,
      wrongPicks
    });
    return true;
  };

  return { done, markStart, pick, shaking, wrongPicks };
}

/** Picks the option whose number key was pressed; returns whether the key was a number for an option */
export function pickByNumberKey(
  event: React.KeyboardEvent,
  options: string[],
  onPick: (value: string) => void
) {
  const option = options[Number.parseInt(event.key, 10) - 1];
  if (option === undefined) return false;
  event.preventDefault();
  onPick(option);
  return true;
}

/** The next slot of the same kind in document order that is not answered yet */
export function nextOpenSlot(current: HTMLElement | null, kind: ChoiceSlotKind) {
  if (!current) return null;
  const slots = document.querySelectorAll<HTMLElement>(
    `[data-choice-slot="${kind}"]:not([data-done="true"])`
  );
  return (
    Array.from(slots).find(
      (slot) =>
        slot !== current &&
        Boolean(current.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING)
    ) ?? null
  );
}

type ChoiceListProps = {
  options: string[];
  /** Wrong picks, shown struck out and no longer pickable */
  struck: string[];
  onPick: (value: string) => void;
  /** Footer under the options */
  keyHint: string;
  /** Monospace options, for words rather than meanings */
  mono?: boolean;
};

/** Numbered candidates inside a choice popup; the popup handles the number keys with `pickByNumberKey` */
export function ChoiceList({ options, struck, onPick, keyHint, mono = false }: ChoiceListProps) {
  return (
    <div className="flex flex-col">
      {options.map((option, index) => {
        const isStruck = struck.includes(option);
        return (
          <button
            key={option}
            type="button"
            // aria-disabled, not disabled: a disabled button that holds focus drops it out of the popup, and the number keys stop working
            aria-disabled={isStruck}
            onClick={() => {
              if (!isStruck) onPick(option);
            }}
            className={cn(
              "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent",
              isStruck && "cursor-not-allowed text-muted-foreground hover:bg-transparent"
            )}
          >
            <kbd className="rounded border px-1.5 font-mono text-[11px] text-muted-foreground">
              {index + 1}
            </kbd>
            <span className={cn(mono && "font-mono", isStruck && "line-through")}>{option}</span>
          </button>
        );
      })}
      <p className="mt-1 border-t px-2 pt-1.5 text-[11px] text-muted-foreground">{keyHint}</p>
    </div>
  );
}
