import { useRef, useState } from "react";

import { useShake } from "#/hooks/use-shake";
import { cn } from "#/lib/utils";

// The success token is too light for text; mixing in the foreground keeps it readable in both themes
const SUCCESS_TEXT = "text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const SUCCESS_BORDER =
  "border-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const WARNING_BORDER =
  "border-[color-mix(in_oklab,var(--color-warning)_55%,var(--color-foreground))]";

/** `box` sits in body text as a small field; `inline` takes the sentence's font and shows a dashed underline */
export type TraceInputVariant = "box" | "inline";

export type TraceInputProps = {
  /** Word to type over; matching ignores case */
  word: string;
  /** Called once the whole word is typed */
  onComplete?: (word: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  /** Accessible name of the input */
  label?: string;
  variant?: TraceInputVariant;
  className?: string;
};

const isPrefixOf = (value: string, word: string) =>
  word.toLowerCase().startsWith(value.toLowerCase());

const isWhole = (value: string, word: string) => value.toLowerCase() === word.toLowerCase();

/** Length of the case-insensitive common prefix */
function matchLength(value: string, word: string) {
  const typed = value.toLowerCase();
  const target = word.toLowerCase();
  let length = 0;
  while (length < typed.length && typed[length] === target[length]) length += 1;
  return length;
}

/**
 * Inline input that shows the word in grey and turns each typed letter green.
 * A key that breaks the prefix shakes the box and is dropped. IME composition is checked once it ends.
 * `box`: once the word is typed and focus leaves, it reads as plain text; clicking it focuses the input again.
 * `inline`: the dashed underline turns solid green once the word is typed.
 */
export function TraceInput({
  word,
  onComplete,
  onFocus,
  autoFocus = false,
  label = `Type ${word}`,
  variant = "box",
  className
}: TraceInputProps) {
  const [value, setValue] = useState("");
  const [composing, setComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [shaking, shake] = useShake();
  // Value before an IME composition started; a composition that breaks the prefix rolls back to it
  const beforeComposition = useRef("");

  const accept = (next: string, previous: string) => {
    if (!isPrefixOf(next, word)) {
      setValue(previous);
      shake();
      return;
    }
    setValue(next);
    if (isWhole(next, word) && !isWhole(previous, word)) onComplete?.(word);
  };

  const inline = variant === "inline";
  const done = !composing && isWhole(value, word);
  const asText = !inline && done && !focused;
  const matched = matchLength(value, word);
  // The input sits over the text, so both need the same font, padding, and line height
  const textBox = inline
    ? "px-0.5 py-0 font-[inherit] text-[length:inherit] leading-snug"
    : "px-2 py-1 text-base leading-relaxed";

  return (
    <span
      className={cn(
        "relative inline-flex cursor-text align-baseline",
        inline
          ? cn(
              "rounded-none border-b-2 border-dashed bg-transparent transition-colors focus-within:bg-warning/15",
              WARNING_BORDER,
              done && cn("border-solid", SUCCESS_BORDER)
            )
          : cn(
              "rounded-sm border border-input bg-background transition-[border-color,box-shadow] focus-within:ring-3 focus-within:ring-ring/15",
              done && SUCCESS_BORDER,
              asText && "border-transparent bg-transparent"
            ),
        shaking && "border-destructive motion-safe:animate-shake",
        className
      )}
    >
      <input
        type="text"
        value={value}
        aria-label={label}
        // Off by default; the caller turns it on for the first slot of an exercise
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => {
          if (composing) setValue(event.target.value);
          else accept(event.target.value, value);
        }}
        onCompositionStart={() => {
          beforeComposition.current = value;
          setComposing(true);
        }}
        onCompositionEnd={(event) => {
          setComposing(false);
          accept(event.currentTarget.value, beforeComposition.current);
        }}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        className={cn(
          "absolute inset-0 z-10 size-full bg-transparent text-transparent caret-info outline-none",
          textBox
        )}
      />
      <span aria-hidden="true" className={cn("whitespace-pre", textBox, asText && "px-0")}>
        <span className={asText ? "text-foreground" : SUCCESS_TEXT}>{word.slice(0, matched)}</span>
        <span className="text-muted-foreground/60">{word.slice(matched)}</span>
      </span>
    </span>
  );
}
