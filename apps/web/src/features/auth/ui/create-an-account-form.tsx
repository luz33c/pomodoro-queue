import { SignUp } from "@clerk/tanstack-react-start";

import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { FieldDescription } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "#/shared/ui/container";
import { LogoIcon } from "#/shared/ui/logo";

import { type AuthRedirectTarget } from "#/features/auth/lib/app-redirect";
import {
  toClerkAppPath,
  toClerkAuthPath,
  toClerkRedirectUrl
} from "#/features/auth/lib/clerk-urls";

import { appConfig } from "#/config/app.config";

export function CreateAnAccountForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: AuthRedirectTarget }) {
  return (
    <Container className={cn("flex max-w-md flex-col items-center gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
          <span className="sr-only">{appConfig.site.shortName}</span>
        </Link>
      </div>

      <SignUp
        forceRedirectUrl={toClerkRedirectUrl(redirectTo)}
        path={toClerkAppPath("/create-an-account")}
        signInForceRedirectUrl={toClerkRedirectUrl(redirectTo)}
        signInUrl={toClerkAuthPath("/sign-in", redirectTo)}
      />

      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
