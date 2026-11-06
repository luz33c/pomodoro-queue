// Clerk as an OAuth 2.0 provider for a public client: authorization code with PKCE (RFC 7636, RFC 8252).
// Endpoints come from the instance's /.well-known/oauth-authorization-server.
import { type DesktopAuthConfig } from "#shared/auth/types";

// offline_access returns a refresh token; openid returns an ID token whose `sub` is the Clerk user ID.
const SCOPES = "openid profile email offline_access";

// Clerk's documented access token lifetime, used only when a response omits expires_in.
const DEFAULT_EXPIRES_IN_SECONDS = 24 * 60 * 60;

export type OAuthClient = {
  clientId: string;
  frontendApiUrl: string;
};

export type OAuthTokens = {
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  /** Null when the server keeps the current refresh token instead of rotating it. */
  refreshToken: string | null;
  userId: string | null;
};

export type RefreshResult =
  | { kind: "ok"; tokens: OAuthTokens }
  /** The refresh token was revoked or expired; the user has to sign in again. */
  | { kind: "invalid" }
  /** Network or server failure; keep the refresh token and try again later. */
  | { kind: "unavailable" };

export type Pkce = {
  challenge: string;
  state: string;
  verifier: string;
};

type TokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  id_token?: unknown;
  refresh_token?: unknown;
};

/** `pk_test_<base64("<host>$")>` → `https://<host>` */
function frontendApiFromPublishableKey(publishableKey: string) {
  const encoded = publishableKey.split("_")[2];
  const host = encoded ? atob(encoded).replace(/\$$/, "") : "";
  if (!host) {
    throw new Error("The Clerk publishable key does not contain a Frontend API host");
  }
  return `https://${host}`;
}

export function createOAuthClient(config: DesktopAuthConfig): OAuthClient {
  return {
    clientId: config.clientId,
    frontendApiUrl: frontendApiFromPublishableKey(config.publishableKey)
  };
}

function randomBase64Url(byteLength: number) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(byteLength))).toString("base64url");
}

export async function createPkce(): Promise<Pkce> {
  const verifier = randomBase64Url(32);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return {
    challenge: Buffer.from(digest).toString("base64url"),
    state: randomBase64Url(16),
    verifier
  };
}

export function buildAuthorizeUrl(
  client: OAuthClient,
  { pkce, redirectUri }: { pkce: Pkce; redirectUri: string }
) {
  const url = new URL("/oauth/authorize", client.frontendApiUrl);
  url.search = new URLSearchParams({
    client_id: client.clientId,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state: pkce.state
  }).toString();
  return url.toString();
}

/** Reads `sub` from a JWT without verifying it. The token came straight from Clerk's token endpoint over TLS. */
function readJwtSubject(token: unknown) {
  if (typeof token !== "string") {
    return null;
  }
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
    };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

function toTokens(body: TokenResponse): OAuthTokens {
  if (typeof body.access_token !== "string") {
    throw new Error("The token response has no access_token");
  }
  const expiresIn =
    typeof body.expires_in === "number" ? body.expires_in : DEFAULT_EXPIRES_IN_SECONDS;
  return {
    accessToken: body.access_token,
    accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
    userId: readJwtSubject(body.id_token) ?? readJwtSubject(body.access_token)
  };
}

function postForm(client: OAuthClient, path: string, form: Record<string, string>) {
  return fetch(new URL(path, client.frontendApiUrl), {
    body: new URLSearchParams({ client_id: client.clientId, ...form }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST"
  });
}

export async function exchangeCode(
  client: OAuthClient,
  { code, redirectUri, verifier }: { code: string; redirectUri: string; verifier: string }
) {
  const response = await postForm(client, "/oauth/token", {
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });
  if (!response.ok) {
    throw new Error(`Code exchange failed with ${response.status}: ${await response.text()}`);
  }
  return toTokens((await response.json()) as TokenResponse);
}

export async function refreshTokens(
  client: OAuthClient,
  refreshToken: string
): Promise<RefreshResult> {
  let response: Response;
  try {
    response = await postForm(client, "/oauth/token", {
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    return { kind: "ok", tokens: toTokens((await response.json()) as TokenResponse) };
  }

  // RFC 6749 §5.2: an invalid, expired, or revoked refresh token is reported as invalid_grant.
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return body?.error === "invalid_grant" ? { kind: "invalid" } : { kind: "unavailable" };
}

/** Best effort: a failed revocation must not keep the user signed in on this machine. */
export async function revokeToken(client: OAuthClient, token: string) {
  try {
    await postForm(client, "/oauth/token/revoke", { token });
  } catch (error) {
    console.warn("Revoking the OAuth token failed", error);
  }
}
