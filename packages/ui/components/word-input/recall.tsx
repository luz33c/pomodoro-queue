import { cn } from "#/lib/utils";

// The success token is too light for text; mixing in the foreground keeps it readable in both themes
const SUCCESS =
  "border-b-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))] text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";

/** Result of the caller's check; `idle` until it checks, and again once the value changes */
export type RecallStatus = "idle" | "correct" | "wrong";

export type RecallInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "size" | "children"
> & {
  /** Answer; shown as the placeholder once a check marks the value wrong */
  word: string;
  value: string;
  onValueChange: (value: string) => void;
  status?: RecallStatus;
};

/**
 * Blank inline input for typing a word from memory. It never checks the value itself:
 * the caller compares it, passes `status`, and usually clears a wrong value so the answer shows as a hint.
 */
export function RecallInput({
  word,
  value,
  onValueChange,
  status = "idle",
  className,
  "aria-label": ariaLabel = "Type the missing word",
  ...props
}: RecallInputProps) {
  // At least 8 characters wide, so a short answer does not show its length
  const minSize = Math.max(word.length, 8);

  return (
    <input
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      {...props}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      size={Math.max(value.length, minSize) + 3}
      placeholder={status === "wrong" ? word : undefined}
      aria-label={ariaLabel}
      aria-invalid={status === "wrong" || undefined}
      className={cn(
        "w-auto rounded-none border border-transparent border-b-input bg-transparent p-1 text-center text-sm leading-6 transition-colors outline-none focus:rounded-md focus:border-ring",
        status === "wrong" && "border-b-destructive placeholder:text-destructive/80",
        status === "correct" && SUCCESS,
        className
      )}
    />
  );
}
