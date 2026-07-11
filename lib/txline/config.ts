export type TxLineNetwork = "mainnet";

export type TxLineNetworkConfig = {
  network: TxLineNetwork;
  rpcUrl: string;
  apiOrigin: string;
  apiBaseUrl: string;
  authUrl: string;
  programId: string;
  txlTokenMint: string;
};

export const TXLINE_NETWORKS = {
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://mainnet.helius-rpc.com/?api-key=f2fb9353-95d0-40a1-b12c-2792ac6146df",
    apiOrigin: "https://txline.txodds.com",
    apiBaseUrl: "https://txline.txodds.com/api",
    authUrl: "https://txline.txodds.com/auth/guest/start",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
  },
} as const satisfies Record<TxLineNetwork, TxLineNetworkConfig>;

export function resolveTxLineNetwork(): TxLineNetwork {
  return "mainnet";
}

export function getTxLineConfig(network?: TxLineNetwork): TxLineNetworkConfig {
  return TXLINE_NETWORKS[network ?? resolveTxLineNetwork()];
}

export function getTxLineEnvCredentials() {
  return {
    guestJwt: process.env.TXLINE_GUEST_JWT,
    apiToken: process.env.TXLINE_API_TOKEN,
  };
}
