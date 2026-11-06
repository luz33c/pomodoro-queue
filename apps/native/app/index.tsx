import { useAuth, useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "#/components/primary-button";
import { Screen } from "#/components/screen";

import { orpc } from "#/utils/orpc";

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const health = useQuery(orpc.health.live.queryOptions());
  const isApiHealthy = health.data?.status === "healthy";

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TSU Stack Native</Text>
        <Text style={styles.title}>Clerk-powered mobile access</Text>
        <Text style={styles.description}>
          Sign in with the same Clerk account and call the shared oRPC API from Expo.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>API status</Text>
          {health.isLoading ? <ActivityIndicator /> : null}
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.dot, isApiHealthy ? styles.dotHealthy : styles.dotDown]} />
          <Text style={styles.statusText}>
            {health.isLoading ? "Checking server..." : isApiHealthy ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {!isLoaded ? (
          <ActivityIndicator />
        ) : isSignedIn ? (
          <>
            <Text style={styles.cardTitle}>Signed in</Text>
            <Text style={styles.muted}>
              {user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? "Clerk user"}
            </Text>
            <Link href="/dashboard" asChild>
              <PrimaryButton>Open dashboard</PrimaryButton>
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Not signed in</Text>
            <Text style={styles.muted}>Use your Clerk account to unlock protected API calls.</Text>
            <Link href="/sign-in" asChild>
              <PrimaryButton>Sign in</PrimaryButton>
            </Link>
            <Link href="/sign-up" asChild>
              <PrimaryButton variant="secondary">Create account</PrimaryButton>
            </Link>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e7ec",
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  cardTitle: {
    color: "#101828",
    fontSize: 17,
    fontWeight: "700"
  },
  description: {
    color: "#475467",
    fontSize: 16,
    lineHeight: 23
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  dotDown: {
    backgroundColor: "#d92d20"
  },
  dotHealthy: {
    backgroundColor: "#039855"
  },
  eyebrow: {
    color: "#155eef",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  hero: {
    gap: 10,
    paddingTop: 24
  },
  muted: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  statusText: {
    color: "#344054",
    fontSize: 14
  },
  title: {
    color: "#101828",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 40
  }
});
