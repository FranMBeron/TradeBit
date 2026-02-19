import { formatRelativeTime } from "@/lib/utils";
import { TradeEmbed } from "./TradeEmbed";
import { ReactionBar } from "./ReactionBar";
import type { Post, ReactionType } from "@/types/feed";

interface PostCardProps {
  post: Post;
  currentUserId: string | undefined;
  onReact: (postId: string, type: ReactionType, action: "add" | "remove") => void;
  onCopyTrade: (post: Post) => void;
}

function Avatar({ name }: { name: string }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d99ff]/15 text-sm font-bold text-[#0d99ff] ring-1 ring-[#0d99ff]/20 font-heading">
      {initial}
    </div>
  );
}

export function PostCard({ post, currentUserId, onReact, onCopyTrade }: PostCardProps) {
  const displayName = post.author.displayName ?? post.author.username;

  return (
    <article className="border-b border-border px-4 py-4 transition-colors hover:bg-[#202127] duration-100">
      <div className="flex gap-3">
        <Avatar name={displayName} />

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-semibold text-foreground leading-none font-heading">
              {displayName}
            </span>
            <span className="text-sm text-muted-foreground leading-none">
              @{post.author.username}
            </span>
            <span className="text-muted-foreground/50 leading-none">·</span>
            <time
              dateTime={post.createdAt}
              className="text-sm text-muted-foreground leading-none"
            >
              {formatRelativeTime(post.createdAt)}
            </time>
          </div>

          {/* Content */}
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {post.content}
          </p>

          {/* Trade embed */}
          {post.tradeTicker && (
            <TradeEmbed
              post={post}
              currentUserId={currentUserId}
              onCopyTrade={onCopyTrade}
            />
          )}

          {/* Reactions */}
          <ReactionBar post={post} onReact={onReact} />
        </div>
      </div>
    </article>
  );
}
