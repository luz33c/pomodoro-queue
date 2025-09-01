import React from 'react';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Warm up the browser on Android
WebBrowser.maybeCompleteAuthSession();

export default function GoogleOAuthButton() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const onPress = React.useCallback(async () => {
    try {
      const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/'),
      });

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        router.replace('/');
      } else {
        // Use signIn or signUp for next steps such as MFA
        console.log('Additional steps required', { signIn, signUp });
      }
    } catch (err: any) {
      console.error('OAuth error', err);
      Alert.alert('Authentication Error', err.errors?.[0]?.message || 'Failed to authenticate with Google');
    }
  }, [startOAuthFlow, router]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm"
    >
      <View className="mr-3">
        <Text style={{ fontSize: 16 }}>🔍</Text>
      </View>
      <Text className="text-gray-700 font-medium">Continue with Google</Text>
    </TouchableOpacity>
  );
}