import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "#/lib/utils";

const DARK_CLASS_REGEX = /(?:dark:bg-|bg-)[a-zA-Z0-9-]+/g;

const spinnerVariants = cva("relative block opacity-[0.65]", {
  defaultVariants: {
    size: "sm"
  },
  variants: {
    size: {
      lg: "size-8",
      md: "size-6",
      sm: "size-4",
      xs: "size-3"
    }
  }
});

export type SpinnerProps = {
  loading?: boolean;
  block?: boolean;
} & useRender.ComponentProps<"span"> &
  VariantProps<typeof spinnerVariants>;

function Spinner({
  className,
  size,
  loading = true,
  block = false,
  render,
  ...props
}: SpinnerProps) {
  const classNameInput = cn("bg-current", className);

  const [bgColorClass, filteredClassName] = React.useMemo(() => {
    const bgClass = classNameInput?.match(DARK_CLASS_REGEX) ?? [];
    const filteredClasses = classNameInput?.replace(DARK_CLASS_REGEX, "").trim();

    return [bgClass, filteredClasses];
  }, [classNameInput]);

  const spinner = useRender({
    defaultTagName: "span",
    render,
    props: mergeProps<"span">(props, {
      className: cn("relative -left-0.25", spinnerVariants({ className: filteredClassName, size })),
      children: Array.from({ length: 8 }).map((_, i) => (
        <span
          className="animate-spinner-leaf-fade absolute top-0 left-1/2 h-full w-[12.5%]"
          key={i}
          style={{
            animationDelay: `${-(7 - i) * 100}ms`,
            transform: `rotate(${i * 45}deg)`
          }}
        >
          <span className={cn("block h-[30%] w-full rounded-full", bgColorClass)}></span>
        </span>
      ))
    })
  });

  if (!loading) return null;

  if (block) {
    return <div className="grid h-96 w-full place-items-center">{spinner}</div>;
  }

  return spinner;
}

export { Spinner };
