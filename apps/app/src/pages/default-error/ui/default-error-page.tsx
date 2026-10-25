import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { m } from "@tsu-stack/i18n/messages";
import { log } from "@tsu-stack/logger/client";
import { Button, buttonVariants } from "@tsu-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

import { appConfig } from "#/shared/config/app";

const loggedErrorKeys = new Set<string>();

/**
 * TanStack Router hands the error boundary whatever was thrown, typed as `unknown`
 * since anything can be thrown in JavaScript. Normalize before reading Error fields.
 */
function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function DefaultErrorPage({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    const normalizedError = normalizeError(error);
    const errorKey = `${normalizedError.name}:${normalizedError.message}:${normalizedError.stack ?? ""}`;

    if (loggedErrorKeys.has(errorKey)) {
      return;
    }

    loggedErrorKeys.add(errorKey);

    log.error({
      action: "global_error_boundary",
      error: {
        message: normalizedError.message,
        name: normalizedError.name,
        stack: normalizedError.stack
      }
    });
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% text-9xl font-extrabold">
            {m.error_500__title()}
          </EmptyTitle>
          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            {m.error_500__description_line_1()} <br />
            {m.error_500__description_line_2()}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Link className={buttonVariants({ light: "skeuomorphic" })} to={appConfig.homePath}>
              <Home data-icon="inline-start" />
              {m.error_500__go_home()}
            </Link>

            <Button onClick={reset} variant="outline">
              <RefreshCw data-icon="inline-start" />
              {m.error_500__try_again()}
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
