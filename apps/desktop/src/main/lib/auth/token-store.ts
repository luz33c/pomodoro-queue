import { secrets } from "bun";

/** What survives a restart. The access token stays in memory and is refreshed on first use. */
export type StoredSession = {
  refreshToken: string;
  userId: string | null;
};

/**
 * The refresh token in the operating system's credential store (Keychain, libsecret, Credential Manager).
 * One entry per app identifier and channel, so dev and stable builds keep separate sessions.
 */
export function createTokenStore({ channel, identifier }: { channel: string; identifier: string }) {
  const entry = { name: `${channel}.session`, service: identifier };

  async function read(): Promise<StoredSession | null> {
    try {
      const value = await secrets.get(entry);
      if (!value) {
        return null;
      }
      const session = JSON.parse(value) as Partial<StoredSession>;
      return typeof session.refreshToken === "string"
        ? { refreshToken: session.refreshToken, userId: session.userId ?? null }
        : null;
    } catch (error) {
      console.error("Reading the desktop session from the credential store failed", error);
      return null;
    }
  }

  async function write(session: StoredSession) {
    await secrets.set({ ...entry, value: JSON.stringify(session) });
  }

  async function clear() {
    try {
      await secrets.delete(entry);
    } catch (error) {
      console.error("Deleting the desktop session from the credential store failed", error);
    }
  }

  return { clear, read, write };
}

export type TokenStore = ReturnType<typeof createTokenStore>;
