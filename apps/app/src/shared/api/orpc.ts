import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { type AppRouterClient } from "@tsu-stack/api/routers/types";
import { ENV_APP } from "@tsu-stack/env/app/env";

import { getAuthToken } from "#/shared/api/auth-token";

// Bearer tokens only: the desktop host runs on views://, which cannot store cookies
const link = new RPCLink({
  headers: async () => {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  url: `${ENV_APP.VITE_SERVER_URL}/rpc`
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
