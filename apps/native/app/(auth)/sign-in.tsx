import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "#/components/primary-button";
import { Screen } from "#/components/screen";

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "longMessage" in error) {
    const message = error.longMessage;
    if (typeof message === "string") return message;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function findEmailCodeFactor(signIn: ReturnType<typeof useSignIn>["signIn"]) {
  return signIn.supportedSecondFactors.find((factor) => factor.strategy === "email_code");
}

export default function SignInScreen() {
  const router = useRouter();
  const { errors, fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const emailCodeFactor = findEmailCodeFactor(signIn);
  const requiresEmailCode =
    signIn.status === "needs_client_trust" ||
    (signIn.status === "needs_second_factor" && !!emailCodeFactor);

  async function finalizeSignIn() {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (!session?.currentTask) {
          router.replace("/dashboard");
        }
      }
    });
  }

  async function handleSubmit() {
    setStatusMessage(null);

    try {
      const result = await signIn.password({ emailAddress, password });

      if (result.error) {
        setStatusMessage(getErrorMessage(result.error, "Unable to sign in. Please try again."));
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
        return;
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        // Read the factors from the attempt `password()` just created; this render's value predates it
        const factor = findEmailCodeFactor(signIn);
        if (factor) {
          await signIn.mfa.sendEmailCode();
          setStatusMessage(`We sent a verification code to ${factor.safeIdentifier}.`);
          return;
        }

        setStatusMessage("A second factor is required, but only email codes are supported here.");
        return;
      }

      setStatusMessage("Sign-in could not be completed. Please try again.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Unable to sign in. Please try again."));
    }
  }

  async function handleVerify() {
    setStatusMessage(null);

    try {
      await signIn.mfa.verifyEmailCode({ code });

      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else {
        setStatusMessage("That code did not complete sign-in. Please try again.");
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Unable to verify the code. Please try again."));
    }
  }

  if (requiresEmailCode) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Verify your account</Text>
          <Text style={styles.description}>Enter the email code from Clerk.</Text>
        </View>
        {statusMessage ? <Text style={styles.helper}>{statusMessage}</Text> : null}
        <TextInput
          style={styles.input}
          value={code}
          placeholder="Verification code"
          placeholderTextColor="#98a2b3"
          onChangeText={setCode}
          keyboardType="numeric"
        />
        {errors.fields.code ? <Text style={styles.error}>{errors.fields.code.message}</Text> : null}
        <PrimaryButton onPress={handleVerify} disabled={!code || fetchStatus === "fetching"}>
          Verify
        </PrimaryButton>
        <PrimaryButton
          variant="secondary"
          onPress={() => {
            void signIn.mfa.sendEmailCode();
          }}
        >
          Send a new code
        </PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.description}>Use the same Clerk account as the web app.</Text>
      </View>
      {statusMessage ? <Text style={styles.helper}>{statusMessage}</Text> : null}

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoComplete="email"
        value={emailAddress}
        placeholder="name@example.com"
        placeholderTextColor="#98a2b3"
        onChangeText={setEmailAddress}
        keyboardType="email-address"
      />
      {errors.fields.identifier ? (
        <Text style={styles.error}>{errors.fields.identifier.message}</Text>
      ) : null}

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        placeholder="Password"
        placeholderTextColor="#98a2b3"
        secureTextEntry
        onChangeText={setPassword}
      />
      {errors.fields.password ? (
        <Text style={styles.error}>{errors.fields.password.message}</Text>
      ) : null}

      <PrimaryButton
        onPress={handleSubmit}
        disabled={!emailAddress || !password || fetchStatus === "fetching"}
      >
        Sign in
      </PrimaryButton>

      <View style={styles.inlineLink}>
        <Text style={styles.muted}>Need an account?</Text>
        <Link href="/sign-up" style={styles.link}>
          Create one
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: {
    color: "#475467",
    fontSize: 15,
    lineHeight: 22
  },
  error: {
    color: "#d92d20",
    fontSize: 12,
    marginTop: -8
  },
  header: {
    gap: 8,
    paddingTop: 24
  },
  helper: {
    backgroundColor: "#eff4ff",
    borderRadius: 10,
    color: "#1849a9",
    fontSize: 13,
    lineHeight: 18,
    padding: 12
  },
  inlineLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 8
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#d0d5dd",
    borderRadius: 10,
    borderWidth: 1,
    color: "#101828",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  label: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700"
  },
  link: {
    color: "#155eef",
    fontSize: 14,
    fontWeight: "700"
  },
  muted: {
    color: "#667085",
    fontSize: 14
  },
  title: {
    color: "#101828",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0
  }
});
