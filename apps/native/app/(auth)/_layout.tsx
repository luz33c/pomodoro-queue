import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { EmptyState, Screen } from "#/components/screen";

export default function AuthRoutesLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Screen>
        <EmptyState title="Loading session" />
      </Screen>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
      <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
    </Stack>
  );
}
