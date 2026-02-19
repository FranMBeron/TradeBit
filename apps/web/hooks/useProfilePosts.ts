"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Post } from "@/types/feed";

export function useProfilePosts(username: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const initializedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPosts = useCallback(
    async (cursor?: string) => {
      const url = cursor
        ? `/users/${username}/posts?cursor=${encodeURIComponent(cursor)}`
        : `/users/${username}/posts`;
      return apiFetch<{ posts: Post[]; nextCursor: string | null }>(url);
    },
    [username],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    fetchPosts()
      .then(({ posts, nextCursor }) => {
        setPosts(posts);
        setNextCursor(nextCursor);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: more, nextCursor: nc } = await fetchPosts(nextCursor);
      setPosts((prev) => [...prev, ...more]);
      setNextCursor(nc);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPosts]);

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

  const updateReaction = useCallback(
    (postId: string, type: string, action: "add" | "remove") => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const delta = action === "add" ? 1 : -1;
          return {
            ...p,
            reactions: {
              ...p.reactions,
              [type]: Math.max(0, ((p.reactions as Record<string, number>)[type] ?? 0) + delta),
            },
            userReactions:
              action === "add"
                ? [...p.userReactions, type]
                : p.userReactions.filter((r) => r !== type),
          };
        }),
      );
    },
    [],
  );

  return { posts, loading, loadingMore, error, sentinelRef, updateReaction };
}
