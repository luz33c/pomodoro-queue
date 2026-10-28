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

// The success token is too light for borders; mixing in the foreground keeps it visible in both themes
const SUCCESS_BORDER =
  "border-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";

export type WordChoiceInputProps = {
  /** Right answer */
  word: string;
  /** Options including the answer, usually four */
  candidates: string[];
  /** Same width for every slot in a text, so the slot does not give the length away */
  slotWidthCh?: number;
  /** Called once the answer is picked */
  onResult?: (attempt: ChoiceAttempt) => void;
  /** Accessible name of the empty slot */
  label?: string;
  /** Footer under the options */
  keyHint?: string;
  className?: string;
};

/**
 * Blank slot in a sentence that opens the candidate words. A wrong pick is struck out and shakes the slot;
 * the right one fills the slot and moves focus to the next open word slot.
 */
export function WordChoiceInput({
  word,
  candidates,
  slotWidthCh,
  onResult,
  label = "Choose the missing word",
  keyHint = `Press 1–${candidates.length} · Esc to close`,
  className
}: WordChoiceInputProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Set by the right pick, so closing moves focus on instead of back to this slot
  const advance = useRef(false);
  const { done, markStart, pick, shaking, wrongPicks } = useChoiceAttempt(word, onResult);

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
    return nextOpenSlot(triggerRef.current, "word") ?? true;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        ref={triggerRef}
        data-choice-slot="word"
        data-done={done}
        aria-label={done ? word : label}
        className={cn(
          "inline-flex justify-center rounded-sm border border-input bg-background px-2 py-1 align-baseline text-base leading-relaxed transition-[border-color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          done
            ? cn("cursor-default text-foreground", SUCCESS_BORDER)
            : "text-muted-foreground/60 hover:border-muted-foreground",
          open && "border-ring ring-3 ring-ring/15",
          shaking && "border-destructive motion-safe:animate-shake",
          className
        )}
        style={{ minWidth: `${slotWidthCh ?? word.length + 2}ch` }}
      >
        {done ? word : "____"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        finalFocus={finalFocus}
        onKeyDown={(event) => pickByNumberKey(event, candidates, handlePick)}
        className="w-auto min-w-48 gap-0 p-1"
      >
        <ChoiceList
          options={candidates}
          struck={wrongPicks}
          onPick={handlePick}
          keyHint={keyHint}
          mono
        />
      </PopoverContent>
    </Popover>
  );
}
