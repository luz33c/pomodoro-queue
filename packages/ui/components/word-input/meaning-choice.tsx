import { useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/popover";
import {
  type ChoiceAttempt,
  ChoiceList,
  nextOpenSlot,
  pickByNumberKey,
  useChoiceAttempt
} from "#/components/word-input/choice-list";
import { cn } from "#/lib/utils";

// The success and warning tokens are too light for lines; mixing in the foreground keeps them visible in both themes
const SUCCESS_BORDER =
  "border-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const WARNING_BORDER =
  "border-[color-mix(in_oklab,var(--color-warning)_55%,var(--color-foreground))]";

export type MeaningChoiceInputProps = {
  /** Word shown in the sentence */
  word: string;
  /** Right meaning, shown after the word once picked */
  meaning: string;
  /** Meanings including the right one, usually four */
  candidates: string[];
  /** Called once the right meaning is picked */
  onResult?: (attempt: ChoiceAttempt) => void;
  /** Accessible name of the word before it is answered */
  label?: string;
  /** Footer under the options */
  keyHint?: string;
  className?: string;
};

/**
 * Highlighted word in a sentence that opens candidate meanings. A wrong pick is struck out and shakes the word;
 * the right one shows the meaning after the word and moves focus to the next open meaning slot.
 */
export function MeaningChoiceInput({
  word,
  meaning,
  candidates,
  onResult,
  label = `Choose the meaning of ${word}`,
  keyHint = `Press 1–${candidates.length} · Esc to close`,
  className
}: MeaningChoiceInputProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Set by the right pick, so closing moves focus on instead of back to this word
  const advance = useRef(false);
  const { done, markStart, pick, shaking, wrongPicks } = useChoiceAttempt(meaning, onResult);

  const handleOpenChange = (next: boolean) => {
    if (done) return;
    if (next) markStart();
    setOpen(next);
  };

  const handlePick = (value: string) => {
    if (!pick(value)) return;
    advance.current = true;
    setOpen(false);
  };

  const finalFocus = () => {
    if (!advance.current) return true;
    advance.current = false;
    return nextOpenSlot(triggerRef.current, "meaning") ?? true;
  };

  return (
    <span className={cn("inline", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          ref={triggerRef}
          data-choice-slot="meaning"
          data-done={done}
          aria-label={done ? `${word}: ${meaning}` : label}
          className={cn(
            "inline rounded-t-sm border-b-2 px-1 align-baseline text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
            done
              ? cn("cursor-default border-solid bg-success/20", SUCCESS_BORDER)
              : cn("border-dotted bg-warning/25 hover:bg-warning/40", WARNING_BORDER),
            open && "ring-3 ring-ring/15",
            shaking && "border-destructive motion-safe:animate-shake"
          )}
        >
          {word}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          finalFocus={finalFocus}
          onKeyDown={(event) => pickByNumberKey(event, candidates, handlePick)}
          className="w-auto min-w-56 gap-0 p-1"
        >
          <ChoiceList
            options={candidates}
            struck={wrongPicks}
            onPick={handlePick}
            keyHint={keyHint}
          />
        </PopoverContent>
      </Popover>
      {done && (
        <span className="ml-1 rounded-sm border bg-background px-1.5 py-0.5 align-middle font-sans text-xs text-muted-foreground">
          {meaning}
        </span>
      )}
    </span>
  );
}
