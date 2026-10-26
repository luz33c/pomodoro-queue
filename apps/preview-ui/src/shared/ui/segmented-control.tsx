import { cn } from "@tsu-stack/ui/lib/utils";

type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group */
  label: string;
  options: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

/** Pill-shaped single choice; option values double as their capitalized labels. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className
}: SegmentedControlProps<T>) {
  return (
    <fieldset
      aria-label={label}
      className={cn("flex w-fit rounded-full bg-muted p-0.5 ring-1 ring-border", className)}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onValueChange(option)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11.5px] font-medium capitalize transition-colors duration-150",
            option === value
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </fieldset>
  );
}
