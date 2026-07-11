import { getTxLineConfig, getTxLineEnvCredentials } from "./config";
import type { TxLineClientOptions, TxLineRequestOptions } from "./types";

export class TxLineApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`TxLINE API request failed with status ${status}`);
    this.name = "TxLineApiError";
    this.status = status;
    this.body = body;
  }
}

function appendQuery(url: URL, query: TxLineRequestOptions["query"]) {
  if (!query) return;

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new TxLineApiError(
      response.status,
      typeof body === "string" ? body : JSON.stringify(body),
    );
  }

  return body as T;
}

export function createTxLineClient(options: TxLineClientOptions = {}) {
  const config = getTxLineConfig(options.network);
  const envCredentials = getTxLineEnvCredentials();
  const guestJwt = options.guestJwt ?? envCredentials.guestJwt;
  const apiToken = options.apiToken ?? envCredentials.apiToken;
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, options: TxLineRequestOptions = {}) {
    const {
      query,
      requireAuth = true,
      requireApiToken = true,
      headers,
      ...init
    } = options;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${config.apiBaseUrl}${normalizedPath}`);
    appendQuery(url, query);

    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has("Content-Type") && init.body) {
      requestHeaders.set("Content-Type", "application/json");
    }
    if (requireAuth) {
      if (!guestJwt) throw new Error("Missing TXLINE_GUEST_JWT.");
      requestHeaders.set("Authorization", `Bearer ${guestJwt}`);
    }
    if (requireApiToken) {
      if (!apiToken) throw new Error("Missing TXLINE_API_TOKEN.");
      requestHeaders.set("Api-Token", apiToken);
      requestHeaders.set("X-Api-Token", apiToken);
    }

    const response = await fetcher(url, {
      ...init,
      headers: requestHeaders,
    });

    return parseResponse<T>(response);
  }

  function streamUrl(path: string, query?: TxLineRequestOptions["query"]) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${config.apiBaseUrl}${normalizedPath}`);
    appendQuery(url, query);
    return url.toString();
  }

  return {
    config,
    request,
    streamUrl,
  };
}
