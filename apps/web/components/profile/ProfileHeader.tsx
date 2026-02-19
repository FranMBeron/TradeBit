"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { UserProfile, AuthUser } from "@/types/feed";

interface Props {
  profile: UserProfile;
  currentUser: AuthUser | null;
}

export function ProfileHeader({ profile, currentUser }: Props) {
  const isOwnProfile = currentUser?.id === profile.id;
  const [following, setFollowing] = useState(profile.isFollowing);
  const [followerCount, setFollowerCount] = useState(profile.stats.followers);
  const [pending, setPending] = useState(false);
  const [hoveringFollow, setHoveringFollow] = useState(false);

  const initials = (profile.displayName ?? profile.username).charAt(0).toUpperCase();

  async function handleFollow() {
    if (pending) return;
    const wasFollowing = following;
    // Optimistic update
    setFollowing(!wasFollowing);
    setFollowerCount((c) => c + (wasFollowing ? -1 : 1));
    setPending(true);
    try {
      await apiFetch(`/users/${profile.id}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
      });
    } catch {
      // Revert on error
      setFollowing(wasFollowing);
      setFollowerCount((c) => c + (wasFollowing ? 1 : -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center text-primary text-xl font-mono font-semibold shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground leading-tight">
              {profile.displayName ?? profile.username}
            </p>
            <p className="text-sm text-muted-foreground font-mono">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Follow button */}
        {!isOwnProfile && currentUser && (
          <Button
            size="sm"
            variant={following ? "outline" : "default"}
            disabled={pending}
            onClick={handleFollow}
            onMouseEnter={() => setHoveringFollow(true)}
            onMouseLeave={() => setHoveringFollow(false)}
            className="shrink-0"
          >
            {following ? (hoveringFollow ? "Unfollow" : "Following") : "Follow"}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-1 text-sm">
        {[
          { label: "followers", value: followerCount },
          { label: "following", value: profile.stats.following },
          { label: "posts", value: profile.stats.posts },
        ].map(({ label, value }, i) => (
          <span key={label} className="flex items-center gap-1">
            {i > 0 && <span className="text-border mx-2">·</span>}
            <span className="font-mono font-semibold text-foreground">{value}</span>
            <span className="text-muted-foreground text-xs">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-3 bg-muted rounded w-48 mt-2" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex gap-4">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    </div>
  );
}
