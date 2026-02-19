"use client";
import Link from "next/link";
import { useCopyTradeHistory } from "@/hooks/useCopyTradeHistory";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { CopyTradeEntry } from "@/hooks/useCopyTradeHistory";

const STATUS_STYLES = {
  executed: {
    border: "border-l-emerald-500",
    dot: "bg-emerald-400",
    label: "Executed",
    text: "text-emerald-400",
  },
  failed: {
    border: "border-l-rose-500",
    dot: "bg-rose-400",
    label: "Failed",
    text: "text-rose-400",
  },
  pending: {
    border: "border-l-amber-500",
    dot: "bg-amber-400",
    label: "Pending",
    text: "text-amber-400",
  },
} as const;

function TradeRow({ trade }: { trade: CopyTradeEntry }) {
  const s = STATUS_STYLES[trade.status];
  const isBuy = trade.post.tradeAction === "BUY";

  return (
    <div
      className={`bg-card border border-border border-l-2 ${s.border} rounded-xl px-4 py-3 flex items-center gap-3`}
    >
      {/* Status dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />

      {/* Trade info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {trade.post.tradeTicker && trade.post.tradeAction && (
            <>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  isBuy
                    ? "bg-primary/15 text-primary"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {trade.post.tradeAction}
              </span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {trade.post.tradeTicker}
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          <span className="font-mono text-sm text-foreground">
            {formatCurrency(trade.requestedAmount)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href={`/${trade.post.author.username}`}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            @{trade.post.author.username}
          </Link>
        </div>
        {trade.status === "failed" && trade.errorMessage && (
          <p className="text-xs text-rose-400 mt-0.5 truncate">{trade.errorMessage}</p>
        )}
      </div>

      {/* Status + time */}
      <div className="text-right shrink-0">
        <p className={`text-xs font-medium ${s.text}`}>{s.label}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatRelativeTime(trade.createdAt)}
        </p>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="bg-card border border-border border-l-2 border-l-muted rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
      <div className="h-2 w-2 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted rounded w-52" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 bg-muted rounded w-16" />
        <div className="h-2.5 bg-muted rounded w-10 ml-auto" />
      </div>
    </div>
  );
}

export default function CopyTradesPage() {
  const { trades, loading, loadingMore, error, sentinelRef } = useCopyTradeHistory();

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Copy Trade History</h1>
        <p className="text-sm text-muted-foreground">Your past copy trades</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
        ) : error ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Could not load history.
          </p>
        ) : trades.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground mb-3">No copy trades yet.</p>
            <Link href="/feed" className="text-sm text-primary hover:underline">
              Browse the feed →
            </Link>
          </div>
        ) : (
          trades.map((trade) => <TradeRow key={trade.id} trade={trade} />)
        )}
        {loadingMore && <RowSkeleton />}
        <div ref={sentinelRef} />
      </div>
    </div>
  );
}
