import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { m } from "@tsu-stack/i18n/messages";
import { type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";

import { getAppUrl } from "#/shared/lib/app-url";

type NavbarLink =
  | {
      label: () => string;
      href: LinkProps["href"];
      // External links open in a new tab unless they stay inside the product
      target?: "_blank" | "_self";
      to?: never;
    }
  | { label: () => string; href?: never; to: LinkProps["to"] };

export const navLinks: NavbarLink[] = [
  {
    label: () => m.navbar__playground(),
    to: "/playground"
  },
  {
    href: getAppUrl("/dashboard"),
    label: () => m.navbar__dashboard(),
    target: "_self"
  },
  {
    href: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/docs`,
    label: () => m.navbar__api_docs()
  }
];
