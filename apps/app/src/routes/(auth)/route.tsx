import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AuthGate } from "#/features/auth/index";

import { AppShell } from "#/widgets/app-shell/index";

export const Route = createFileRoute("/(auth)")({
  component: AuthLayout
});

function AuthLayout() {
  return (
    <AuthGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGate>
  );
}
