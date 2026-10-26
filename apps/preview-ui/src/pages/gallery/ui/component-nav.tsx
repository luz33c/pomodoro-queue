import { useEffect, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { type DemoCategory } from "#/pages/gallery/demos/catalog";

// A card becomes current once its top passes this share of the viewport height
const ACTIVE_LINE = 0.35;

/** Anchor links to every card, highlighting the last one whose top has scrolled past the active line. */
export function ComponentNav({ categories }: { categories: DemoCategory[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(categories[0]?.entries[0]?.id);

  useEffect(() => {
    const ids = categories.flatMap((category) => category.entries.map((entry) => entry.id));

    const onScroll = () => {
      // The last cards may never reach the line, so the bottom of the page selects the last one
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = ids.filter((id) => {
        const card = document.getElementById(id);
        return (
          card !== null && card.getBoundingClientRect().top <= window.innerHeight * ACTIVE_LINE
        );
      });
      setActiveId(atBottom ? ids.at(-1) : (passed.at(-1) ?? ids[0]));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  return (
    <nav aria-label="Components" className="flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category.id}>
          <p className="mb-2 px-2 text-xs text-muted-foreground">{category.title}</p>
          <ul className="flex flex-col gap-0.5">
            {category.entries.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  aria-current={activeId === entry.id ? "location" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
                    activeId === entry.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {entry.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
