import { createTxLineClient } from "./http";
import type {
  FixtureSnapshotQuery,
  FixtureUpdateQuery,
  OddsSnapshotQuery,
  PurchaseQuoteRequest,
  PurchaseQuoteResponse,
  TxLineClientOptions,
  TxLineRecord,
  ValidationQuery,
} from "./types";

export function createTxLineApi(options: TxLineClientOptions = {}) {
  const client = createTxLineClient(options);

  return {
    purchaseQuote(payload: PurchaseQuoteRequest) {
      return client.request<PurchaseQuoteResponse>("/guest/purchase/quote", {
        method: "POST",
        body: JSON.stringify(payload),
        requireApiToken: false,
      });
    },

    getFixturesSnapshot(query?: FixtureSnapshotQuery) {
      return client.request<TxLineRecord[]>("/fixtures/snapshot", { query });
    },

    getFixtureUpdates(fixtureId: number | string, query?: FixtureUpdateQuery) {
      return client.request<TxLineRecord[]>(`/fixtures/updates/${fixtureId}`, {
        query,
      });
    },

    getFixtureValidation(query: ValidationQuery = {}) {
      return client.request<TxLineRecord>("/fixtures/validation", { query });
    },

    getFixtureBatchValidation(query: ValidationQuery = {}) {
      return client.request<TxLineRecord>("/fixtures/validation/batch", { query });
    },

    getOddsSnapshot(fixtureId: number | string, query?: OddsSnapshotQuery) {
      return client.request<TxLineRecord[]>(`/odds/snapshot/${fixtureId}`, {
        query,
      });
    },

    getLiveOddsUpdates(fixtureId: number | string) {
      return client.request<TxLineRecord[]>(`/odds/updates/${fixtureId}`);
    },

    getHistoricalOddsUpdates(
      epochDay: number,
      hourOfDay: number,
      interval: number,
    ) {
      return client.request<TxLineRecord[]>(
        `/odds/updates/${epochDay}/${hourOfDay}/${interval}`,
      );
    },

    getOddsValidation(query: ValidationQuery = {}) {
      return client.request<TxLineRecord>("/odds/validation", { query });
    },

    getOddsStreamUrl(query?: ValidationQuery) {
      return client.streamUrl("/odds/stream", query);
    },

    getScoresSnapshot(fixtureId: number | string) {
      return client.request<TxLineRecord[]>(`/scores/snapshot/${fixtureId}`);
    },

    getHistoricalScoreUpdates(
      epochDay: number,
      hourOfDay: number,
      interval: number,
    ) {
      return client.request<TxLineRecord[]>(
        `/scores/updates/${epochDay}/${hourOfDay}/${interval}`,
      );
    },

    getLiveScoreUpdates(fixtureId: number | string) {
      return client.request<TxLineRecord[]>(`/scores/updates/${fixtureId}`);
    },

    getHistoricalScores(fixtureId: number | string) {
      return client.request<TxLineRecord[]>(`/scores/historical/${fixtureId}`);
    },

    getScoresStreamUrl(query?: ValidationQuery) {
      return client.streamUrl("/scores/stream", query);
    },

    getScoresValidation(query: ValidationQuery = {}) {
      return client.request<TxLineRecord>("/scores/validation", { query });
    },
  };
}
