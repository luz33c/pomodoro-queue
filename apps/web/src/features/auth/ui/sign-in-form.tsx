import { SignIn } from "@clerk/tanstack-react-start";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";
import { FieldDescription } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "#/shared/ui/container";
import { LogoIcon } from "#/shared/ui/logo";

import { toClerkAppPath, toClerkAuthPath } from "#/features/auth/lib/clerk-urls";

import { appConfig } from "#/config/app.config";

export function SignInForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateTo }) {
  return (
    <Container className={cn("flex max-w-md flex-col items-center gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
          <span className="sr-only">{appConfig.site.shortName}</span>
        </Link>
      </div>

      <SignIn
        forceRedirectUrl={toClerkAppPath(redirectTo)}
        path={toClerkAppPath("/sign-in")}
        signUpForceRedirectUrl={toClerkAppPath(redirectTo)}
        signUpUrl={toClerkAuthPath("/create-an-account", redirectTo)}
      />

      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
