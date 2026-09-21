import "server-only";

import { ManagedIdentityCredential } from "@azure/identity";

let credentialClientId: string | undefined;
let credential: ManagedIdentityCredential | undefined;

function getCredential(clientId: string) {
  if (!credential || credentialClientId !== clientId) {
    credential = new ManagedIdentityCredential(clientId);
    credentialClientId = clientId;
  }
  return credential;
}

export async function getAsqAccessToken(
  scope: string,
  managedIdentityClientId: string,
): Promise<string> {
  const token = await getCredential(managedIdentityClientId).getToken(scope);
  if (!token?.token) {
    throw new Error("Azure managed identity did not return an access token.");
  }
  return token.token;
}
