import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

import { m } from "@uni-stack/i18n/messages";
import { buttonVariants } from "@uni-stack/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@uni-stack/ui/components/empty";

import { appConfig } from "#/config/app";

export function DefaultNotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% text-9xl font-extrabold">
            {m.error_404__title()}
          </EmptyTitle>
          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            {m.error_404__description_line_1()} <br />
            {m.error_404__description_line_2()}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            className={buttonVariants({ light: "skeuomorphic", size: "lg" })}
            to={appConfig.homePath}
          >
            <Home data-icon="inline-start" />
            {m.error_404__go_home()}
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  );
}
