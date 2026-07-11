import { getTxLineConfig } from "./config";
import { createTxLineClient } from "./http";
import type {
  ActivateSubscriptionRequest,
  GuestSessionResponse,
  TxLineClientOptions,
} from "./types";

export async function startGuestSession(options: TxLineClientOptions = {}) {
  const config = getTxLineConfig(options.network);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(config.authUrl, { method: "POST" });

  if (!response.ok) {
    throw new Error(`TxLINE guest session failed with status ${response.status}`);
  }

  return response.json() as Promise<GuestSessionResponse>;
}

export function buildActivationMessage(
  txSig: string,
  leagues: number[] = [],
  guestJwt: string,
) {
  return `${txSig}:${leagues.join(",")}:${guestJwt}`;
}

export function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function signActivationPayload(params: {
  txSig: string;
  leagues?: number[];
  guestJwt: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array> | Uint8Array;
}) {
  const message = buildActivationMessage(
    params.txSig,
    params.leagues,
    params.guestJwt,
  );
  const signature = await params.signMessage(new TextEncoder().encode(message));

  return {
    txSig: params.txSig,
    leagues: params.leagues ?? [],
    walletSignature: bytesToBase64(signature),
  } satisfies ActivateSubscriptionRequest;
}

export async function activateSubscription(
  payload: ActivateSubscriptionRequest,
  options: TxLineClientOptions = {},
) {
  const client = createTxLineClient({
    ...options,
    apiToken: options.apiToken ?? "activation-does-not-use-api-token",
  });

  return client.request<string>("/token/activate", {
    method: "POST",
    body: JSON.stringify({
      txSig: payload.txSig,
      walletSignature: payload.walletSignature,
      leagues: payload.leagues ?? [],
    }),
    requireApiToken: false,
  });
}

export async function activateWorldCupFreeTier(
  options: TxLineClientOptions = {},
) {
  const client = createTxLineClient({
    ...options,
    apiToken: options.apiToken ?? "activation-does-not-use-api-token",
  });

  return client.request<string>("/token/activate", {
    method: "POST",
    body: JSON.stringify({ leagues: [] }),
    requireApiToken: false,
  });
}
