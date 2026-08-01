import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

export const getClerkAuthState = createServerFn({ method: "GET" }).handler(async () => {
  const authState = await auth();

  return {
    isAuthenticated: authState.isAuthenticated,
    userId: authState.userId ?? null
  };
});

export type ClerkAuthState = Awaited<ReturnType<typeof getClerkAuthState>>;
