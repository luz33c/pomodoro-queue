import { Link } from "expo-router";

import { PrimaryButton } from "#/components/primary-button";
import { EmptyState, Screen } from "#/components/screen";

export default function NotFoundScreen() {
  return (
    <Screen>
      <EmptyState title="Page not found" description="This native route does not exist yet." />
      <Link href="/" asChild>
        <PrimaryButton>Go home</PrimaryButton>
      </Link>
    </Screen>
  );
}
