import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { type AppRouterClient } from "@uni-stack/api/client/types";
import { ENV_APP } from "@uni-stack/env/app/env";

import { getAuthToken } from "#/lib/api-client/auth-token";

// Bearer tokens only: the desktop host runs on views://, which cannot store cookies
const link = new RPCLink({
  headers: async () => {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  // 2.0 takes a path as `url`; the server URL, /server path included, is the origin
  origin: ENV_APP.VITE_SERVER_URL,
  url: "/rpc"
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
