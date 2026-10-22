import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

import { type AppRouterClient } from "@tsu-stack/api/routers/types";
import { ENV_NATIVE } from "@tsu-stack/env/native/env";

import { getClerkAuthToken } from "#/utils/clerk-auth";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000
    }
  }
});

const link = new RPCLink({
  headers: async () => {
    const token = await getClerkAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  url: `${ENV_NATIVE.EXPO_PUBLIC_SERVER_URL}/rpc`
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
