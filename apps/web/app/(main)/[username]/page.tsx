"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useProfilePosts } from "@/hooks/useProfilePosts";
import { useCopyTrade } from "@/hooks/useCopyTrade";
import { ProfileHeader, ProfileHeaderSkeleton } from "@/components/profile/ProfileHeader";
import { PerformanceCard } from "@/components/profile/PerformanceCard";
import { PostCard } from "@/components/feed/PostCard";
import { CopyTradeModal } from "@/components/feed/CopyTradeModal";
import type { UserProfile, ReactionType } from "@/types/feed";

function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-2.5 bg-muted rounded w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { posts, loading: postsLoading, sentinelRef, updateReaction } = useProfilePosts(username);
  const copyTrade = useCopyTrade();

  useEffect(() => {
    setProfileLoading(true);
    setNotFound(false);
    apiFetch<{ user: UserProfile }>(`/users/${username}`)
      .then(({ user: p }) => setProfile(p))
      .catch((err: { status?: number }) => {
        if (err?.status === 404) setNotFound(true);
      })
      .finally(() => setProfileLoading(false));
  }, [username]);

  async function handleReact(postId: string, type: ReactionType, action: "add" | "remove") {
    updateReaction(postId, type, action);
    try {
      await apiFetch(`/posts/${postId}/reactions/${type}`, {
        method: action === "remove" ? "DELETE" : "POST",
      });
    } catch {
      updateReaction(postId, type, action === "add" ? "remove" : "add");
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">User not found.</p>
        <Link href="/feed" className="text-sm text-primary hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      {/* Header */}
      {profileLoading || !profile ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader profile={profile} currentUser={user} />
      )}

      {/* Performance */}
      {profile?.performanceChange && (
        <PerformanceCard perf={profile.performanceChange} />
      )}

      {/* Posts */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Posts
        </p>
        <div className="space-y-4">
          {postsLoading ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : posts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onReact={handleReact}
                onCopyTrade={copyTrade.openModal}
              />
            ))
          )}
          <div ref={sentinelRef} />
        </div>
      </div>

      {/* Copy Trade Modal */}
      {copyTrade.open && (
        <CopyTradeModal
          ticker={copyTrade.ticker}
          action={copyTrade.action}
          price={copyTrade.price}
          loading={copyTrade.loading}
          success={copyTrade.success}
          error={copyTrade.error}
          closeModal={copyTrade.closeModal}
          execute={copyTrade.execute}
        />
      )}
    </div>
  );
}
