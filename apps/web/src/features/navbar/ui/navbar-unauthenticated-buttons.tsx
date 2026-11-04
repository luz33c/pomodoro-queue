import { m } from "@uni-stack/i18n/messages";
import { Link } from "@uni-stack/i18n/tanstack-start/components/link";
import { useLocation } from "@uni-stack/i18n/tanstack-start/hooks/use-location";
import { stripLocalePrefix } from "@uni-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { buttonVariants } from "@uni-stack/ui/components/button";

export function NavbarUnauthenticatedButtons() {
  const location = useLocation();
  const redirect = stripLocalePrefix(location.href);

  return (
    <>
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        to="/sign-in"
        search={{ redirect }}
      >
        {m.navbar__sign_in()}
      </Link>
      <Link
        className={buttonVariants({ light: "skeuomorphic", size: "sm" })}
        to="/create-an-account"
        search={{ redirect }}
      >
        {m.navbar__get_started()}
      </Link>
    </>
  );
}
