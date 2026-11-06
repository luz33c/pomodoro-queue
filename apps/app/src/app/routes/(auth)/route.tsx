import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "#/components/layouts/app-shell/app-shell";

import { AuthGate } from "#/features/auth/index";

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
