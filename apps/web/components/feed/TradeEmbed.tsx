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
    <div className="mt-3 rounded-xl border border-border-subtle bg-background-alt p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {/* Badge + ticker */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${
                isBuy
                  ? "bg-[#2e81fd]/15 text-[#2e81fd] ring-1 ring-[#2e81fd]/30"
                  : "bg-[#fe566b]/15 text-[#fe566b] ring-1 ring-[#fe566b]/30"
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
            className="shrink-0 rounded-lg border border-[#0d99ff]/40 bg-[#0d99ff]/10 px-3 py-1.5 text-xs font-semibold text-[#0d99ff] transition-all hover:bg-[#0d99ff]/20 hover:border-[#0d99ff]/60 active:scale-95 font-heading"
          >
            Copy Trade →
          </button>
        )}
      </div>
    </div>
  );
}
