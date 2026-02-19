"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useFeed } from "@/hooks/useFeed";
import { useCopyTrade } from "@/hooks/useCopyTrade";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";
import { CopyTradeModal } from "./CopyTradeModal";

function PostCardSkeleton() {
  return (
    <div className="animate-pulse border-b border-border px-4 py-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-36 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="flex gap-2 pt-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 w-12 rounded-full bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl">🌐</span>
      <p className="font-semibold text-foreground">Tu feed está vacío</p>
      <p className="text-sm text-muted-foreground">
        Seguí a otros traders para ver sus operaciones aquí.
      </p>
    </div>
  );
}

function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">⚠️ No pudimos cargar el feed.</p>
      <button
        onClick={onRetry}
        className="text-xs text-primary underline underline-offset-4 hover:opacity-80"
      >
        Reintentar
      </button>
    </div>
  );
}

export function FeedTimeline() {
  const { user } = useAuth();
  const { posts, loading, loadingMore, hasMore, error, sentinelRef, addPost, updateReaction } =
    useFeed();
  const copyTrade = useCopyTrade();

  if (error) {
    return <FeedError onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <PostComposer user={user} onPost={addPost} />

      <div className="mt-4 rounded-xl border border-border overflow-hidden">
        {loading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onReact={updateReaction}
                onCopyTrade={copyTrade.openModal}
              />
            ))}

            {/* Sentinel para IntersectionObserver */}
            <div ref={sentinelRef} className="h-px" />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Ya viste todo por ahora 🎉
              </p>
            )}
          </>
        )}
      </div>

      {copyTrade.open && <CopyTradeModal {...copyTrade} />}
    </>
  );
}
