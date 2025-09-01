import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import React from "react";
import GoogleOAuthButton from "../../components/google-oauth-button";

export default function Page() {
	const { signIn, setActive, isLoaded } = useSignIn();
	const router = useRouter();

	const [emailAddress, setEmailAddress] = React.useState("");
	const [password, setPassword] = React.useState("");

	// Handle the submission of the sign-in form
	const onSignInPress = async () => {
		if (!isLoaded) return;

		// Start the sign-in process using the email and password provided
		try {
			const signInAttempt = await signIn.create({
				identifier: emailAddress,
				password,
			});

			// If sign-in process is complete, set the created session as active
			// and redirect the user
			if (signInAttempt.status === "complete") {
				await setActive({ session: signInAttempt.createdSessionId });
				router.replace("/");
			} else {
				// If the status isn't complete, check why. User might need to
				// complete further steps.
				console.error(JSON.stringify(signInAttempt, null, 2));
			}
		} catch (err) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error(JSON.stringify(err, null, 2));
		}
	};

	return (
		<View className="flex-1 justify-center px-6 bg-white">
			<Text className="text-2xl font-bold text-center mb-8">Sign in</Text>
			
			{/* Google OAuth Button */}
			<View className="mb-6">
				<GoogleOAuthButton />
			</View>

			{/* Divider */}
			<View className="flex-row items-center mb-6">
				<View className="flex-1 h-px bg-gray-300" />
				<Text className="mx-4 text-gray-500">or</Text>
				<View className="flex-1 h-px bg-gray-300" />
			</View>

			{/* Email/Password Form */}
			<TextInput
				className="border border-gray-300 rounded-lg px-4 py-3 mb-4 bg-white"
				autoCapitalize="none"
				value={emailAddress}
				placeholder="Enter email"
				onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
			/>
			<TextInput
				className="border border-gray-300 rounded-lg px-4 py-3 mb-6 bg-white"
				value={password}
				placeholder="Enter password"
				secureTextEntry={true}
				onChangeText={(password) => setPassword(password)}
			/>
			<TouchableOpacity 
				className="bg-blue-600 rounded-lg py-3 mb-4"
				onPress={onSignInPress}
			>
				<Text className="text-white text-center font-medium">Continue</Text>
			</TouchableOpacity>
			<View className="flex-row justify-center">
				<Text className="text-gray-600">Don't have an account? </Text>
				<Link href="/sign-up">
					<Text className="text-blue-600 font-medium">Sign up</Text>
				</Link>
			</View>
		</View>
	);
}
