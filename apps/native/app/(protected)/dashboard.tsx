import { useClerk, useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "#/components/primary-button";
import { Screen } from "#/components/screen";

import { orpc } from "#/utils/orpc";

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const privateData = useQuery(orpc.private.data.queryOptions());
  const displayName =
    user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Clerk user";

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Protected</Text>
        <Text style={styles.title}>Welcome, {displayName}</Text>
        <Text style={styles.description}>
          This screen calls a protected oRPC procedure with your Clerk session token.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Private API result</Text>
          {privateData.isLoading ? <ActivityIndicator /> : null}
        </View>
        <Text style={styles.code}>
          {privateData.isLoading
            ? "Loading..."
            : privateData.data
              ? JSON.stringify(privateData.data, null, 2)
              : privateData.error
                ? privateData.error.message
                : "No data"}
        </Text>
      </View>

      <PrimaryButton variant="danger" onPress={handleSignOut}>
        Sign out
      </PrimaryButton>
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
  code: {
    backgroundColor: "#101828",
    borderRadius: 10,
    color: "#f2f4f7",
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 18,
    minHeight: 120,
    padding: 12
  },
  description: {
    color: "#475467",
    fontSize: 15,
    lineHeight: 22
  },
  eyebrow: {
    color: "#155eef",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  header: {
    gap: 8,
    paddingTop: 24
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: "#101828",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0
  }
});
