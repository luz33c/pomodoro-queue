import { type LinkProps } from "@tanstack/react-router";
import { LayoutDashboard, ListTodo, type LucideIcon } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";

import { appConfig } from "#/shared/config/app";

type NavItem = {
  icon: LucideIcon;
  label: () => string;
  to: LinkProps["to"];
};

type ShellLink = {
  href: string;
  label: () => string;
  /** A separate document such as the API reference, as opposed to leaving the product for the website. */
  openInNewTab: boolean;
};

/** Product pages, rendered by the header on wide screens and by the menu sheet on narrow ones. */
export const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: () => m.app_shell__dashboard(),
    to: "/dashboard"
  },
  {
    icon: ListTodo,
    label: () => m.app_shell__todos(),
    to: "/todos"
  }
];

/** Links that leave the product. The desktop shell opens all of them in the system browser. */
export const shellLinks: ShellLink[] = [
  {
    href: appConfig.websiteUrl,
    label: () => m.app_shell__website(),
    openInNewTab: false
  },
  {
    href: appConfig.apiDocsUrl,
    label: () => m.app_shell__api_docs(),
    openInNewTab: true
  }
];
