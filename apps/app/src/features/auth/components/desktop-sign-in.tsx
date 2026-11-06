import { ExternalLink } from "lucide-react";

import { m } from "@uni-stack/i18n/messages";
import { Button } from "@uni-stack/ui/components/button";
import { Spinner } from "@uni-stack/ui/components/spinner";
import { cn } from "@uni-stack/ui/lib/utils";

import { Container } from "#/components/container";
import { type BrowserSignIn, type BrowserSignInError, hostAdapter } from "#/lib/host/index";

import { useGetHealthLiveQuery } from "#/features/auth/api/get-health-live";

function errorMessage(error: BrowserSignInError | null) {
  switch (error) {
    case "denied":
      return m.desktop_sign_in__error_denied();
    case "timeout":
      return m.desktop_sign_in__error_timeout();
    case "session_ended":
      return m.desktop_sign_in__error_session_ended();
    case "port_unavailable":
    case "failed":
      return m.desktop_sign_in__error_failed();
    case "not_configured":
      return m.desktop_sign_in__error_not_configured();
    case null:
      return null;
  }
}

function ApiStatus() {
  const healthLive = useGetHealthLiveQuery();

  return (
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
  );
}

function BrowserSignInPanel({ signIn }: { signIn: BrowserSignIn }) {
  const { error, status } = signIn.useStatus();
  const message = errorMessage(error);

  if (status === "signingIn") {
    return (
      <Container className="flex max-w-md flex-col gap-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl">{m.desktop_sign_in__waiting_title()}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Spinner />
            {m.desktop_sign_in__waiting_description()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void signIn.start()} variant="outline">
            {m.desktop_sign_in__open_browser_again()}
          </Button>
          <Button autoFocus onClick={() => void signIn.cancel()} variant="ghost">
            {m.desktop_sign_in__cancel()}
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">{m.desktop_sign_in__title()}</h1>
        <p className="text-muted-foreground">{m.desktop_sign_in__description()}</p>
      </div>

      {message && (
        <p className="rounded-lg border p-3 text-sm" role="status">
          {message}
        </p>
      )}

      <Button
        className="self-start"
        disabled={status === "loading" || error === "not_configured"}
        onClick={() => void signIn.start()}
      >
        <ExternalLink aria-hidden="true" />
        {m.desktop_sign_in__sign_in()}
      </Button>

      <ApiStatus />
    </Container>
  );
}

const { browserSignIn } = hostAdapter.auth;

/**
 * Pages that need an account show this while signed out. Only a host that works signed out reaches
 * it, and that host signs in through the system browser; elsewhere it renders nothing.
 */
export function DesktopSignIn() {
  return browserSignIn ? <BrowserSignInPanel signIn={browserSignIn} /> : null;
}
