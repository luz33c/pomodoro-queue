import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { buttonVariants } from "@tsu-stack/ui/components/button";
import { ThemeSwitcher } from "@tsu-stack/ui/components/theme-switcher";
import { useScroll } from "@tsu-stack/ui/hooks/use-scroll.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { LocaleSwitcher } from "#/shared/ui/locale-switcher";
import { LogoWordmark } from "#/shared/ui/logo";

import { navLinks } from "#/features/navbar/config/nav-links.config";

import { MobileNav } from "./mobile-nav";
import { UserDropdown } from "./user-dropdown";

const navLinkClassName = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "hover:text-foreground"
);

export function Navbar() {
  const scrolled = useScroll(10);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent bg-background transition-colors not-dark:shadow not-dark:shadow-transparent",
        {
          "not-dark:shadow-black/10 dark:border-border": scrolled
        }
      )}
    >
      <nav className="container mx-auto flex h-(--navbar-height) w-full items-center justify-between px-4">
        <Link className="relative -m-2 rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50" to="/">
          <LogoWordmark className="h-6 w-fit" />
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const label = link.label();

            return link.href ? (
              <a
                className={navLinkClassName}
                key={link.href}
                target={link.target ?? "_blank"}
                href={link.href}
              >
                {label}
              </a>
            ) : (
              <Link className={navLinkClassName} key={link.to} to={link.to}>
                {label}
              </Link>
            );
          })}
          <LocaleSwitcher />
          <ThemeSwitcher size="icon-sm" />
          <UserDropdown />
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
