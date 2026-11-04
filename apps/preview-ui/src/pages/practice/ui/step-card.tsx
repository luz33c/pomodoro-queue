import { cn } from "@uni-stack/ui/lib/utils";

type StepCardProps = {
  number: number;
  title: string;
  hint: string;
  done: number;
  total: number;
  children: React.ReactNode;
};

/** One step of the lesson with its progress */
export function StepCard({ number, title, hint, done, total, children }: StepCardProps) {
  return (
    <section className="rounded-2xl border bg-background p-5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {String(number).padStart(2, "0")}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums",
            done >= total ? "bg-success/20" : "bg-secondary text-muted-foreground"
          )}
        >
          {done}/{total}
        </span>
      </div>
      <p className="mt-1 mb-4 text-xs text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}
