import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser
} from "@clerk/chrome-extension";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";

import { ENV_EXTENSION } from "@tsu-stack/env/extension/env";

import { orpc, queryClient } from "@/utils/orpc";

import "./App.css";

const popupUrl = browser.runtime.getURL("/popup.html");

function ApiStatus() {
  const health = useQuery(orpc.health.live.queryOptions());
  const privateData = useQuery(orpc.private.data.queryOptions());
  const { user } = useUser();
  const displayName =
    user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Clerk user";

  const isApiHealthy = health.data?.status === "healthy";

  return (
    <main className="panel">
      <section className="identity">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1>{displayName}</h1>
        </div>
      </section>

      <section className="status-card">
        <div className="row">
          <span>API status</span>
          <span className={isApiHealthy ? "pill success" : "pill danger"}>
            {health.isLoading ? "Checking" : isApiHealthy ? "Live" : "Offline"}
          </span>
        </div>
      </section>

      <section className="status-card">
        <div className="row">
          <span>Protected data</span>
          <span className={privateData.data ? "pill success" : "pill neutral"}>
            {privateData.isLoading ? "Loading" : privateData.data ? "Ready" : "Empty"}
          </span>
        </div>
        <pre>
          {privateData.isLoading
            ? "Loading..."
            : privateData.data
              ? JSON.stringify(privateData.data, null, 2)
              : privateData.error
                ? privateData.error.message
                : "No data"}
        </pre>
      </section>
    </main>
  );
}

function SignedOutPanel() {
  return (
    <main className="panel signed-out">
      <p className="eyebrow">TSU Stack Extension</p>
      <h1>Sign in with Clerk</h1>
      <p className="description">
        Use the same account as the web and native apps, then call protected oRPC endpoints from the
        extension.
      </p>
      <div className="actions">
        <SignInButton mode="modal">
          <button type="button" className="button primary">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="button secondary">
            Create account
          </button>
        </SignUpButton>
      </div>
    </main>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={ENV_EXTENSION.WXT_CLERK_PUBLISHABLE_KEY}
      syncHost={ENV_EXTENSION.WXT_CLERK_SYNC_HOST}
      afterSignOutUrl={popupUrl}
      signInFallbackRedirectUrl={popupUrl}
      signUpFallbackRedirectUrl={popupUrl}
    >
      <QueryClientProvider client={queryClient}>
        <div className="app-shell">
          <header className="topbar">
            <span className="brand">TSU</span>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          <Show when="signed-out">
            <SignedOutPanel />
          </Show>
          <Show when="signed-in">
            <ApiStatus />
          </Show>
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
