import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import React from "react";

import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import { Portal, PortalBackdrop } from "@tsu-stack/ui/components/portal";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { LocaleSwitcher } from "@/shared/ui/locale-switcher";
import { ThemeSwitcher } from "@/shared/ui/theme-switcher";

import { navLinks } from "@/features/navbar/config/nav-links.config";
import { NavbarAvatar } from "@/features/navbar/ui/navbar-avatar";
export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  const onNavigate = () => setOpen(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <LocaleSwitcher variant="outline" size="icon" />
      <ThemeSwitcher className="md:hidden" variant="outline" />
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
      </Button>
      {open && (
        <Portal className="top-(--navbar-height)" id="mobile-menu">
          <PortalBackdrop className="bg-background!" />
          <div
            className={cn(
              "ease-out data-[slot=open]:animate-in data-[slot=open]:zoom-in-97",
              "size-full p-4"
            )}
            data-slot={open ? "open" : "closed"}
          >
            <div className="grid gap-y-2">
              {navLinks.map((link) => {
                const label = link.label();

                return (
                  <Button
                    onClick={onNavigate}
                    asChild
                    className="w-full justify-start"
                    key={link.href ?? link.to}
                    variant="ghost"
                  >
                    <Link {...(link.href ? { href: link.href } : { to: link.to })}>
                      <span className="max-sm:-ms-2">{label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
            <MobileNavAuth onNavigate={onNavigate} />
          </div>
        </Portal>
      )}
    </div>
  );
}

function MobileNavAuth({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const routerState = useRouterState();
  const { signOut } = useClerkAuth();
  const { isLoaded, isSignedIn, user } = useUser();

  const redirect = routerState.location.search?.redirect;

  const handleSignOut = async () => {
    await signOut();
    await router.invalidate();
    onNavigate();
  };

  if (!isLoaded) {
    return <Skeleton aria-hidden="true" className="mt-12 h-20 w-full" />;
  }

  if (!isSignedIn) {
    return (
      <div className="mt-12 flex flex-col gap-2">
        <Button onClick={onNavigate} asChild className="w-full" variant="outline">
          <Link to="/sign-in" search={redirect ? { redirect } : undefined}>
            Sign In
          </Link>
        </Button>
        <Button onClick={onNavigate} className="w-full" light="skeuomorphic" asChild>
          <Link to="/create-an-account" search={redirect ? { redirect } : undefined}>
            Get Started
          </Link>
        </Button>
      </div>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName ?? user.username ?? email ?? "User";

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="border-t" />
      <div className="flex items-center gap-3 px-2">
        <NavbarAvatar avatarImgSrc={user.imageUrl} name={name} email={email} />
      </div>
      <Button className="w-full" variant="destructive" onClick={handleSignOut}>
        <LogOut aria-hidden="true" size={16} />
        Logout
      </Button>
    </div>
  );
}
