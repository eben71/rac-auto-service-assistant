import "server-only";

import { ManagedIdentityCredential } from "@azure/identity";

const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

interface CachedAccessToken {
  token: string;
  expiresOnTimestamp: number;
}

const credentials = new Map<string, ManagedIdentityCredential>();
const tokenCache = new Map<string, CachedAccessToken>();
const pendingTokenRequests = new Map<string, Promise<string>>();

function getCredential(clientId: string): ManagedIdentityCredential {
  let credential = credentials.get(clientId);
  if (!credential) {
    credential = new ManagedIdentityCredential(clientId);
    credentials.set(clientId, credential);
  }
  return credential;
}

function cacheKey(scope: string, clientId: string): string {
  return `${clientId}\u0000${scope}`;
}

function isReusable(token: CachedAccessToken): boolean {
  return token.expiresOnTimestamp > Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

export async function getAsqAccessToken(
  scope: string,
  managedIdentityClientId: string,
): Promise<string> {
  const key = cacheKey(scope, managedIdentityClientId);
  const cached = tokenCache.get(key);
  if (cached && isReusable(cached)) return cached.token;

  const pending = pendingTokenRequests.get(key);
  if (pending) return pending;

  const tokenRequest = (async () => {
    const accessToken = await getCredential(managedIdentityClientId).getToken(
      scope,
    );
    if (!accessToken?.token) {
      throw new Error("Azure managed identity did not return an access token.");
    }

    tokenCache.set(key, {
      token: accessToken.token,
      expiresOnTimestamp: accessToken.expiresOnTimestamp,
    });
    return accessToken.token;
  })();

  pendingTokenRequests.set(key, tokenRequest);
  try {
    return await tokenRequest;
  } finally {
    if (pendingTokenRequests.get(key) === tokenRequest) {
      pendingTokenRequests.delete(key);
    }
  }
}
