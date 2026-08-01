import { defineConfig } from "wxt";

function asHostPermission(rawUrl: string | undefined) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return `${url.origin}/*`;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: () => {
    const serverUrl =
      process.env.WXT_SERVER_URL ?? process.env.VITE_SERVER_URL ?? "http://localhost:5000/server";
    const syncHost = process.env.WXT_CLERK_SYNC_HOST ?? process.env.VITE_WEB_URL;
    const clerkFrontendApi = process.env.WXT_CLERK_FRONTEND_API;
    const extensionPublicKey = process.env.WXT_EXTENSION_PUBLIC_KEY;

    return {
      ...(extensionPublicKey ? { key: extensionPublicKey } : {}),
      action: {
        default_title: "TSU Stack"
      },
      description: "Access TSU Stack from a Clerk-authenticated browser extension.",
      host_permissions: unique([
        asHostPermission(serverUrl),
        asHostPermission(syncHost),
        asHostPermission(clerkFrontendApi),
        "https://*.clerk.accounts.dev/*",
        "https://*.clerk.com/*",
        "http://localhost/*"
      ]),
      name: "TSU Stack",
      permissions: ["cookies", "storage"]
    };
  }
});
