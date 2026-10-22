import { Outlet, createFileRoute } from "@tanstack/react-router";

import { CenteredLayout } from "#/widgets/layouts/index";

export const Route = createFileRoute("/{-$locale}/(centered-layout)")({
  component: () => (
    <CenteredLayout>
      <Outlet />
    </CenteredLayout>
  )
});
