import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ENV_NATIVE } from "@tsu-stack/env/native/env";

import { setClerkAuthTokenGetter } from "#/utils/clerk-auth";
import { queryClient } from "#/utils/orpc";

function ClerkApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={ENV_NATIVE.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <ClerkApiAuthBridge />
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack>
              <Stack.Screen name="index" options={{ title: "TSU Stack" }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(protected)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
            </Stack>
            <StatusBar style="auto" />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
