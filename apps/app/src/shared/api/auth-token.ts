type AuthTokenGetter = () => Promise<string | null>;

let authTokenGetter: AuthTokenGetter | null = null;

/** Stores the auth provider's getter, not a copied token, so every request resolves a fresh token. */
export function setAuthTokenGetter(getToken: AuthTokenGetter | null) {
  authTokenGetter = getToken;
}

export async function getAuthToken() {
  return (await authTokenGetter?.()) ?? null;
}
