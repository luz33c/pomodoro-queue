import { m } from "@tsu-stack/i18n/messages";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Container } from "#/shared/ui/container";

import { useGetPrivateDataQuery } from "#/pages/dashboard/api/get-private-data";

export function DashboardPage() {
  const privateData = useGetPrivateDataQuery();

  return (
    <Container>
      <h2 className="font-display mb-2 text-4xl">{m.dashboard_page__title()}</h2>
      <section>
        <h2 className="font-display my-8 text-2xl">{m.dashboard_page__protected_rpc_route()}</h2>
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                privateData.data ? "bg-success" : "bg-destructive"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {privateData.isLoading
                ? m.dashboard_page__checking()
                : privateData.data
                  ? m.dashboard_page__successfully_fetched()
                  : m.dashboard_page__failed_to_fetch()}
            </span>
          </div>

          <pre className="overflow-auto rounded bg-muted p-2 text-sm">
            {privateData.isLoading ? (
              <Spinner className="mx-auto my-28" />
            ) : (
              JSON.stringify(privateData.data, null, 2)
            )}
          </pre>
        </div>
      </section>
    </Container>
  );
}
