import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { m } from "@uni-stack/i18n/messages";
import { Button } from "@uni-stack/ui/components/button";
import { ThemeSwitcher } from "@uni-stack/ui/components/theme-switcher";

import { LocaleSwitcher } from "#/components/locale-switcher";
import { appConfig } from "#/config/app";
import { useAppAuth } from "#/lib/host/index";

import { MobileNav } from "./mobile-nav";
import { NavMenu, ShellLinks } from "./nav-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSignedIn, signOut } = useAppAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <MobileNav className="md:hidden" />
          <Link className="font-display me-4 text-xl" to={appConfig.homePath}>
            {appConfig.appName}
          </Link>
          <nav className="hidden md:block">
            <NavMenu orientation="horizontal" />
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <ShellLinks className="hidden md:flex" orientation="horizontal" />
            <LocaleSwitcher size="icon-sm" />
            <ThemeSwitcher size="icon-sm" />
            {/* Local data mode opens the shell without an account */}
            {isSignedIn && (
              <Button
                aria-label={m.app_shell__sign_out()}
                onClick={() => void signOut()}
                size="icon-sm"
                variant="ghost"
              >
                <LogOut aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
