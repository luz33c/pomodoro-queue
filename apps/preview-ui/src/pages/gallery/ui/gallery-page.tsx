import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@tsu-stack/ui/components/button";
import { ThemeSwitcher } from "@tsu-stack/ui/components/theme-switcher";
import { cn } from "@tsu-stack/ui/lib/utils";

import { catalog } from "#/pages/gallery/demos/catalog";

import { ComponentNav } from "./component-nav";
import { ShowcaseCard } from "./showcase-card";

// Cards are numbered continuously across categories
const SECTIONS = catalog.map((category, index) => {
  const offset = catalog
    .slice(0, index)
    .reduce((count, previous) => count + previous.entries.length, 0);
  return { ...category, offset };
});

const COMPONENT_COUNT = catalog.reduce((count, category) => count + category.entries.length, 0);

/** Every composite component in packages/ui, one live card each; base components are not listed. */
export function GalleryPage() {
  return (
    <div className="min-h-dvh bg-[repeating-linear-gradient(135deg,transparent_0_9px,var(--color-border)_9px_10px)]">
      <main className="mx-auto max-w-[1040px] bg-background shadow-[0_0_0_1px_var(--color-border)] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-dashed px-5 pt-10 pb-6 sm:px-7 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:pt-14">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold">tsu-stack/ui</span>
            <ThemeSwitcher />
          </div>
          <h1 className="mt-8 text-xl leading-snug font-semibold tracking-tight text-balance">
            Composite components, live.
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Built from the base components in <code className="font-mono">@tsu-stack/ui</code>.
          </p>

          <div className="mt-8 hidden min-h-0 flex-1 overflow-y-auto border-t border-dashed pt-6 lg:block">
            <ComponentNav categories={catalog} />
          </div>

          <Link
            to="/demo"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-6")}
          >
            Open the demo
            <ArrowRight />
          </Link>
        </aside>

        <div className="min-w-0">
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="border-b border-dashed px-5 pt-8 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-8">
                {section.title}
              </p>
              {section.entries.map((entry, index) => (
                <ShowcaseCard key={entry.id} entry={entry} number={section.offset + index + 1} />
              ))}
            </div>
          ))}

          <footer className="flex items-center justify-between gap-4 px-5 py-6 text-xs text-muted-foreground sm:px-8">
            <span className="font-mono">apps/preview-ui</span>
            <span>{COMPONENT_COUNT} components</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
