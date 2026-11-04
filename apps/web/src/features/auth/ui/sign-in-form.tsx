import { SignIn } from "@clerk/tanstack-react-start";

import { m } from "@uni-stack/i18n/messages";
import { Link } from "@uni-stack/i18n/tanstack-start/components/link";
import { useLocale } from "@uni-stack/i18n/tanstack-start/components/locale-provider";
import { FieldDescription } from "@uni-stack/ui/components/field";
import { cn } from "@uni-stack/ui/lib/utils";

import { Container } from "#/shared/ui/container";
import { LogoIcon } from "#/shared/ui/logo";

import { type AuthRedirectTarget } from "#/features/auth/lib/app-redirect";
import {
  toClerkAppPath,
  toClerkAuthPath,
  toClerkRedirectUrl
} from "#/features/auth/lib/clerk-urls";

import { appConfig } from "#/config/app.config";

export function SignInForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: AuthRedirectTarget }) {
  const { locale } = useLocale();

  return (
    <Container className={cn("flex max-w-md flex-col items-center gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
          <span className="sr-only">{appConfig.site.shortName}</span>
        </Link>
      </div>

      <SignIn
        forceRedirectUrl={toClerkRedirectUrl(redirectTo, locale)}
        path={toClerkAppPath("/sign-in", locale)}
        signUpForceRedirectUrl={toClerkRedirectUrl(redirectTo, locale)}
        signUpUrl={toClerkAuthPath("/create-an-account", redirectTo, locale)}
      />

      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
