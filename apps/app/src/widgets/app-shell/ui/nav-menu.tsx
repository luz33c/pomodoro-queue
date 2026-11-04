import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@uni-stack/ui/components/button";
import { cn } from "@uni-stack/ui/lib/utils";

import { externalLinkProps } from "#/shared/host/external-link";

import { navItems, shellLinks } from "#/widgets/app-shell/config/nav-items";

type NavMenuProps = {
  className?: string;
  /** Lets the menu sheet close itself after a link is followed. */
  onNavigate?: () => void;
  orientation: "horizontal" | "vertical";
};

const listClassName = {
  horizontal: "flex items-center gap-1",
  vertical: "flex flex-col gap-1"
} as const;

const itemClassName = {
  horizontal: buttonVariants({ size: "sm", variant: "ghost" }),
  vertical: cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")
} as const;

export function NavMenu({ className, onNavigate, orientation }: NavMenuProps) {
  return (
    <ul className={cn(listClassName[orientation], className)}>
      {navItems.map(({ icon: Icon, label, to }) => (
        <li key={to}>
          <Link
            activeProps={{ className: "bg-accent" }}
            className={itemClassName[orientation]}
            onClick={onNavigate}
            to={to}
          >
            <Icon aria-hidden="true" data-icon="inline-start" />
            {label()}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ShellLinks({ className, onNavigate, orientation }: NavMenuProps) {
  return (
    <ul className={cn(listClassName[orientation], className)}>
      {shellLinks.map(({ href, label, openInNewTab }) => (
        <li key={href}>
          <a
            className={itemClassName[orientation]}
            href={href}
            onClick={onNavigate}
            {...(openInNewTab ? externalLinkProps : {})}
          >
            {label()}
          </a>
        </li>
      ))}
    </ul>
  );
}
