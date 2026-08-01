import { createClerkClient } from "@clerk/chrome-extension/client";

import { ENV_EXTENSION } from "@tsu-stack/env/extension/env";

type RuntimeRequest = {
  type?: string;
};

type ClerkTokenResponse = {
  token: string | null;
};

async function getFreshClerkToken(): Promise<string | null> {
  const clerk = await createClerkClient({
    background: true,
    publishableKey: ENV_EXTENSION.WXT_CLERK_PUBLISHABLE_KEY,
    syncHost: ENV_EXTENSION.WXT_CLERK_SYNC_HOST
  });

  return (await clerk.session?.getToken()) ?? null;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    async (message: RuntimeRequest): Promise<ClerkTokenResponse | undefined> => {
      if (message.type !== "tsu-stack:get-clerk-token") {
        return undefined;
      }

      try {
        return { token: await getFreshClerkToken() };
      } catch {
        return { token: null };
      }
    }
  );
});
