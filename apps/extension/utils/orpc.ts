import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

import { type AppRouterClient } from "@uni-stack/api/client/types";
import { ENV_EXTENSION } from "@uni-stack/env/extension/env";

type ClerkTokenResponse = {
  token: string | null;
};

async function getClerkTokenFromBackground() {
  const response = (await browser.runtime.sendMessage({
    type: "tsu-stack:get-clerk-token"
  })) as ClerkTokenResponse | undefined;

  return response?.token ?? null;
}

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
    const token = await getClerkTokenFromBackground();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  origin: ENV_EXTENSION.WXT_SERVER_URL,
  url: "/rpc"
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
