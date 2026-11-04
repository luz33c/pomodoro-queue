import { m } from "@uni-stack/i18n/messages";
import { buttonVariants } from "@uni-stack/ui/components/button";
import { cn } from "@uni-stack/ui/lib/utils";

import { appConfig } from "#/shared/config/app";
import { Container } from "#/shared/ui/container";

import { useGetHealthLiveQuery } from "#/features/auth/api/get-health-live";

export function DesktopSignInPlaceholder() {
  const healthLive = useGetHealthLiveQuery();

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">{m.desktop_sign_in__title()}</h1>
        <p className="text-muted-foreground">{m.desktop_sign_in__description()}</p>
      </div>

      {/* The desktop shell opens this off-origin link in the system browser */}
      <a className={buttonVariants({ variant: "outline" })} href={appConfig.websiteUrl}>
        {m.desktop_sign_in__open_website()}
      </a>

      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm">
        <span>{m.desktop_sign_in__api_status()}</span>
        <span
          className={cn(
            "ms-auto h-2 w-2 rounded-full",
            healthLive.data ? "bg-success" : "bg-destructive"
          )}
        />
        <span className="text-muted-foreground">
          {healthLive.isLoading
            ? m.desktop_sign_in__api_checking()
            : healthLive.data
              ? m.desktop_sign_in__api_live()
              : m.desktop_sign_in__api_unavailable()}
        </span>
      </div>
    </Container>
  );
}
