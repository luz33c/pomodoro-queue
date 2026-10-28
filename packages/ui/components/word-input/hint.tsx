import { useState } from "react";

import { useShake } from "#/hooks/use-shake";
import { cn } from "#/lib/utils";

// The success token is too light for text; mixing in the foreground keeps it readable in both themes
const SUCCESS_TEXT = "text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const SUCCESS_BORDER =
  "border-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";

export type HintInputProps = {
  /** Word to type letter by letter; matching ignores case */
  word: string;
  /** Called once the last letter is typed */
  onComplete?: (word: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  /** Accessible name of the input */
  label?: string;
  className?: string;
};

/**
 * One cell per letter with the letters ghosted in. Each key is checked against the next cell:
 * a right one turns it green, a wrong one marks it red and shakes the row.
 * A transparent input over the cells takes the keys, so touch keyboards open too.
 */
export function HintInput({
  word,
  onComplete,
  onFocus,
  autoFocus = false,
  label = `Type ${word} letter by letter`,
  className
}: HintInputProps) {
  const [typed, setTyped] = useState(0);
  const [missAt, setMissAt] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [shaking, shake] = useShake();
  const done = typed >= word.length;

  const handleKey = (key: string) => {
    // Keys during a shake are dropped, like a key held down after a mistake
    if (!key || done || shaking) return;
    if (key.toLowerCase() !== word[typed]?.toLowerCase()) {
      setMissAt(typed);
      shake();
      return;
    }
    setMissAt(null);
    setTyped(typed + 1);
    if (typed + 1 === word.length) onComplete?.(word);
  };

  return (
    <span
      className={cn(
        "relative inline-flex rounded-md border border-transparent bg-secondary p-1 align-middle transition-colors",
        focused && "border-ring",
        done && cn("bg-success/20", SUCCESS_BORDER),
        shaking && "border-destructive motion-safe:animate-shake",
        className
      )}
    >
      {Array.from(word, (letter, index) => (
        <span
          // Letters repeat, so the position is the identity
          key={index}
          aria-hidden="true"
          className={cn(
            "flex h-6 w-4 items-center justify-center font-mono font-medium transition-colors",
            index < typed ? SUCCESS_TEXT : "text-muted-foreground/40",
            shaking && missAt === index && "bg-destructive/15 text-destructive",
            focused && index === typed && "shadow-[inset_0_-2px_0_var(--color-info)]"
          )}
        >
          {letter}
        </span>
      ))}
      <input
        type="text"
        // Always empty: it only collects keys, and the cells show the progress
        value=""
        aria-label={label}
        // Off by default; the caller turns it on for the first slot of an exercise
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={done}
        onChange={(event) => handleKey(event.target.value.slice(-1))}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 size-full cursor-text text-base opacity-0"
      />
    </span>
  );
}
