// ── Wallbit API Types ───────────────────────────────────────

export interface WallbitBalance {
  currency: string;
  balance: number;
}

export interface WallbitStockPosition {
  symbol: string;
  shares: number;
  usdBalance: number;
}

export interface WallbitAsset {
  symbol: string;
  name: string;
  price: number;
  sector: string;
  marketCap: number;
  description: string;
}

export interface WallbitTradeRequest {
  symbol: string;
  direction: "BUY" | "SELL";
  currency: string;
  order_type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  amount?: number;
  shares?: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force?: "DAY" | "GTC";
}

export interface WallbitTradeResponse {
  id: string;
  status: string;
  symbol: string;
  direction: string;
  amount: number;
  shares: number;
}

// ── Client ──────────────────────────────────────────────────

const BASE_URL = process.env.WALLBIT_API_BASE_URL || "https://api.wallbit.io";

export class WallbitApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "WallbitApiError";
  }
}

async function wallbitFetch<T>(apiKey: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new WallbitApiError(res.status, `Wallbit API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/** Validate an API key by calling balance/checking. Returns true if 200. */
export async function validateKey(apiKey: string): Promise<boolean> {
  try {
    await wallbitFetch(apiKey, "/api/public/v1/balance/checking");
    return true;
  } catch (err) {
    if (err instanceof WallbitApiError && (err.status === 401 || err.status === 403)) {
      return false;
    }
    throw err;
  }
}

/** Get checking account balances. */
export async function getCheckingBalance(apiKey: string): Promise<WallbitBalance[]> {
  return wallbitFetch<WallbitBalance[]>(apiKey, "/api/public/v1/balance/checking");
}

/** Get stock portfolio positions. */
export async function getStockPortfolio(apiKey: string): Promise<WallbitStockPosition[]> {
  return wallbitFetch<WallbitStockPosition[]>(apiKey, "/api/public/v1/balance/stocks");
}

/** Get details for a specific asset/ticker. */
export async function getAsset(apiKey: string, symbol: string): Promise<WallbitAsset> {
  return wallbitFetch<WallbitAsset>(apiKey, `/api/public/v1/assets/${encodeURIComponent(symbol)}`);
}

/** Execute a trade (BUY/SELL). */
export async function executeTrade(
  apiKey: string,
  trade: WallbitTradeRequest,
): Promise<WallbitTradeResponse> {
  return wallbitFetch<WallbitTradeResponse>(apiKey, "/api/public/v1/trades", {
    method: "POST",
    body: JSON.stringify(trade),
  });
}
