import { Menu } from "lucide-react";
import { useState } from "react";

import { m } from "@uni-stack/i18n/messages";
import { Button } from "@uni-stack/ui/components/button";
import { Separator } from "@uni-stack/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@uni-stack/ui/components/sheet";

import { appConfig } from "#/config/app";

import { NavMenu, ShellLinks } from "./nav-menu";

export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            aria-label={m.app_shell__open_menu()}
            className={className}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{appConfig.appName}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 px-4">
          <NavMenu onNavigate={close} orientation="vertical" />
          <Separator />
          <ShellLinks onNavigate={close} orientation="vertical" />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
