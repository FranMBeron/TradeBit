"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface CopyTradeEntry {
  id: string;
  status: "pending" | "executed" | "failed";
  requestedAmount: string;
  errorMessage: string | null;
  executedAt: string | null;
  createdAt: string;
  post: {
    id: string;
    content: string;
    tradeTicker: string | null;
    tradeAction: "BUY" | "SELL" | null;
    tradeAmount: string | null;
    author: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
}

interface HistoryResponse {
  trades: CopyTradeEntry[];
  nextCursor: string | null;
}

export function useCopyTradeHistory() {
  const [trades, setTrades] = useState<CopyTradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const initializedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (cursor?: string): Promise<HistoryResponse> => {
    const url = cursor
      ? `/copy-trade/history?cursor=${encodeURIComponent(cursor)}`
      : `/copy-trade/history`;
    return apiFetch<HistoryResponse>(url);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetchPage()
      .then(({ trades, nextCursor }) => {
        setTrades(trades);
        setNextCursor(nextCursor);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { trades: more, nextCursor: nc } = await fetchPage(nextCursor);
      setTrades((prev) => [...prev, ...more]);
      setNextCursor(nc);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return { trades, loading, loadingMore, error, sentinelRef };
}
