import { auth as clerkAuth } from "@clerk/tanstack-react-start/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { createLogger } from "@tsu-stack/logger/server";

import { getClerkAuthToken } from "#@/client/tanstack-start/clerk-auth";
import { appRouter } from "#@/routers/index";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () => {
        const authState = await clerkAuth();

        return {
          auth: authState.userId ? { userId: authState.userId } : null,
          logger: createLogger({ operation: "web__client__orpc" })
        };
      }
    })
  )
  .client((): RouterClient<typeof appRouter> => {
    const link = new RPCLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        });
      },
      headers: async () => {
        const token = await getClerkAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/rpc`
    });

    return createORPCClient(link);
  });

export const client = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
