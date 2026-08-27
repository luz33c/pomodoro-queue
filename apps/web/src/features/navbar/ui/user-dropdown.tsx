import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";
import { useRouter } from "@tanstack/react-router";
import { FileText, BarChart2, Lock, LogOut, UserSquare } from "lucide-react";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";

import { NavbarAvatar } from "@/features/navbar/ui/navbar-avatar";
import { NavbarUnauthenticatedButtons } from "@/features/navbar/ui/navbar-unauthenticated-buttons";

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
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open account menu" size="icon" variant="ghost">
          <UserSquare aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-sm min-w-fit">
        <DropdownMenuLabel className="flex items-start gap-3">
          <NavbarAvatar avatarImgSrc={user.imageUrl} name={name} email={email} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/dashboard">
              <BarChart2 aria-hidden="true" className="opacity-60" size={16} />
              <span>{m.user_dropdown__dashboard()}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/privacy-policy">
              <Lock aria-hidden="true" className="opacity-60" size={16} />
              <span>{m.user_dropdown__privacy_policy()}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/terms-of-service">
              <FileText aria-hidden="true" className="opacity-60" size={16} />
              <span>{m.user_dropdown__terms_of_service()}</span>
            </Link>
          </DropdownMenuItem>
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
