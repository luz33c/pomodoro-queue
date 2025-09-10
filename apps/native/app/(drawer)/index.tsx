import { useUser } from '@clerk/clerk-expo';
import { api } from '@clerk-convex-rn/backend/convex/_generated/api';
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from 'convex/react';
import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Container } from '@/components/container';
import { SignOutButton } from '@/components/sign-out-button';

export default function Home() {
  const { user } = useUser();
  const healthCheck = useQuery(api.healthCheck.get);
  const privateData = useQuery(api.privateData.get);

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="font-mono text-foreground text-3xl font-bold mb-4">
          BETTER T STACK
        </Text>
        <View className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-3 w-3 rounded-full ${
                healthCheck ? 'bg-green-500' : 'bg-orange-500'
              }`}
            />
            <View className="flex-1">
              <Text className="text-sm font-medium text-card-foreground">
                Convex
              </Text>
              <Text className="text-xs text-muted-foreground">
                {healthCheck === undefined
                  ? 'Checking connection...'
                  : healthCheck === 'OK'
                    ? 'All systems operational'
                    : 'Service unavailable'}
              </Text>
            </View>
          </View>
        </View>
        <Authenticated>
          <Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
          <Text>Private Data: {privateData?.message}</Text>
          <SignOutButton />
        </Authenticated>
        <Unauthenticated>
          <Link href="/(auth)/sign-in">
            <Text>Sign in</Text>
          </Link>
          <Link href="/(auth)/sign-up">
            <Text>Sign up</Text>
          </Link>
        </Unauthenticated>
        <AuthLoading>
          <Text>Loading...</Text>
        </AuthLoading>
      </ScrollView>
    </Container>
  );
}
