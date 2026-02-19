import { formatCurrency } from "@/lib/utils";
import type { Post } from "@/types/feed";

interface TradeEmbedProps {
  post: Post;
  currentUserId: string | undefined;
  onCopyTrade: (post: Post) => void;
}

export function TradeEmbed({ post, currentUserId, onCopyTrade }: TradeEmbedProps) {
  const isBuy = post.tradeAction === "BUY";
  const canCopy = currentUserId && currentUserId !== post.authorId;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {/* Badge + ticker */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isBuy
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "bg-destructive/15 text-destructive ring-1 ring-destructive/25"
              }`}
            >
              {post.tradeAction ?? "TRADE"}
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {post.tradeTicker}
            </span>
          </div>

          {/* Monto y precio */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatCurrency(post.tradeAmount)}
            </span>
            {post.tradePrice && (
              <>
                <span>·</span>
                <span>@ {formatCurrency(post.tradePrice)}</span>
              </>
            )}
          </div>
        </div>

        {/* Copy trade button */}
        {canCopy && (
          <button
            onClick={() => onCopyTrade(post)}
            className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 active:scale-95"
          >
            Copy Trade →
          </button>
        )}
      </div>
    </div>
  );
}
