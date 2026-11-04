import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@uni-stack/ui/components/button";
import { ThemeSwitcher } from "@uni-stack/ui/components/theme-switcher";

const DEMOS = [
  { label: "Chat", to: "/demo" },
  { label: "Practice", to: "/demo/practice" }
] as const;

/** Top bar of the demo pages: back to the gallery, switch between demos, and the theme. */
export function DemoHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-2.5">
      <Link to="/" className={buttonVariants({ size: "sm", variant: "ghost" })}>
        <ArrowLeft />
        Components
      </Link>
      <nav aria-label="Demos" className="flex rounded-full bg-muted p-0.5 ring-1 ring-border">
        {DEMOS.map((demo) => (
          <Link
            key={demo.to}
            to={demo.to}
            activeOptions={{ exact: true }}
            className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-xs"
          >
            {demo.label}
          </Link>
        ))}
      </nav>
      <ThemeSwitcher />
    </header>
  );
}
