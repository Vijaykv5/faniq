import type { TxLineNetwork } from "./config";

export type TxLineCredentials = {
  guestJwt: string;
  apiToken: string;
};

export type TxLineClientOptions = {
  network?: TxLineNetwork;
  guestJwt?: string;
  apiToken?: string;
  fetcher?: typeof fetch;
};

export type TxLineRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>;
  requireAuth?: boolean;
  requireApiToken?: boolean;
};

export type GuestSessionResponse = {
  token: string;
};

export type ActivateSubscriptionRequest = {
  txSig: string;
  walletSignature: string;
  leagues?: number[];
};

export type PurchaseQuoteRequest = {
  buyerPubkey: string;
  txlineAmount: number;
};

export type PurchaseQuoteResponse = {
  transactionBase64: string;
  baseUsdtCost?: string | number;
  feeUsdtAmount?: string | number;
  totalUsdtCharged?: string | number;
  [key: string]: unknown;
};

export type FixtureSnapshotQuery = {
  startEpochDay?: number;
  competitionId?: number;
};

export type FixtureUpdateQuery = {
  epochDay?: number;
};

export type OddsSnapshotQuery = {
  asOf?: number | string;
};

export type ValidationQuery = Record<string, string | number | boolean | undefined>;

export type TxLineRecord = Record<string, unknown>;
