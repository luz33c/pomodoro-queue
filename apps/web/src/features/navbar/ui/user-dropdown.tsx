import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";
import { useRouter } from "@tanstack/react-router";
import { FileText, BarChart2, Lock, LogOut, UserSquare } from "lucide-react";

import { m } from "@uni-stack/i18n/messages";
import { Link } from "@uni-stack/i18n/tanstack-start/components/link";
import { Button } from "@uni-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@uni-stack/ui/components/dropdown-menu";

import { getAppUrl } from "#/shared/lib/app-url";

import { NavbarAvatar } from "./navbar-avatar";
import { NavbarUnauthenticatedButtons } from "./navbar-unauthenticated-buttons";

export function UserDropdown() {
  const router = useRouter();
  const { signOut } = useClerkAuth();
  const { isLoaded, isSignedIn, user } = useUser();

  const handleSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  if (!isLoaded) {
    return (
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center text-primary"
      >
        <UserSquare className="size-4" />
      </span>
    );
  }

  if (!isSignedIn) {
    return <NavbarUnauthenticatedButtons />;
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName ?? user.username ?? email ?? "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label={m.user_dropdown__open_menu()} size="icon" variant="ghost" />}
      >
        <UserSquare aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-sm min-w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-start gap-3">
            <NavbarAvatar avatarImgSrc={user.imageUrl} name={name} email={email} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem className="cursor-pointer" href={getAppUrl("/dashboard")}>
            <BarChart2 aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__dashboard()}</span>
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem className="cursor-pointer" render={<Link to="/privacy-policy" />}>
            <Lock aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__privacy_policy()}</span>
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem className="cursor-pointer" render={<Link to="/terms-of-service" />}>
            <FileText aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__terms_of_service()}</span>
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={handleSignOut}>
          <LogOut aria-hidden="true" className="opacity-60" />
          <span>{m.user_dropdown__logout()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
