import { Check, Languages } from "lucide-react";

import { m } from "@uni-stack/i18n/messages";
import { getLocale, locales } from "@uni-stack/i18n/runtime";
import { type ButtonProps } from "@uni-stack/ui/components/button";
import { Button } from "@uni-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@uni-stack/ui/components/dropdown-menu";
import { cn } from "@uni-stack/ui/lib/utils";

import { switchLocale } from "#/shared/i18n/locale";

type LocaleSwitcherProps = {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
};

export function LocaleSwitcher({
  size = "icon",
  variant = "ghost",
  className
}: LocaleSwitcherProps) {
  // The locale only changes through a reload, so reading it during render is stable
  const currentLocale = getLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={m.locale_switcher__label()}
            className={className}
            size={size}
            variant={variant}
          />
        }
      >
        <Languages aria-hidden="true" size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => {
          const isActive = locale === currentLocale;
          return (
            <DropdownMenuItem
              key={locale}
              className={cn("cursor-pointer gap-2", isActive && "bg-accent")}
              onClick={() => switchLocale(locale)}
            >
              <span className="flex-1">{m.language_name(undefined, { locale })}</span>
              {isActive && <Check aria-hidden="true" className="opacity-60" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
