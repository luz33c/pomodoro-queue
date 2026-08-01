import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { EmptyState, Screen } from "@/components/screen";

export default function ProtectedRoutesLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Screen>
        <EmptyState title="Loading session" />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
    </Stack>
  );
}
