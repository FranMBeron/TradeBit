"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Post, ReactionType } from "@/types/feed";

interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
}

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Prevent double-fetch from StrictMode double-effect
  const initializedRef = useRef(false);

  const fetchPage = useCallback(async (currentCursor: string | null) => {
    const params = currentCursor ? `?cursor=${encodeURIComponent(currentCursor)}` : "";
    return apiFetch<FeedResponse>(`/feed${params}`);
  }, []);

  // Initial load
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchPage(null)
      .then((data) => {
        setPosts(data.posts);
        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      })
      .catch(() => setError("No pudimos cargar el feed."))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || cursor === null) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch {
      // silencioso — el usuario puede scrollear de nuevo
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, fetchPage, hasMore, loadingMore]);

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, loading]);

  // Prepend post nuevo (para PostComposer)
  const addPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  // Actualización optimista de reacciones
  const updateReaction = useCallback(
    (postId: string, type: ReactionType, action: "add" | "remove") => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const delta = action === "add" ? 1 : -1;
          return {
            ...p,
            reactions: { ...p.reactions, [type]: p.reactions[type] + delta },
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

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    sentinelRef,
    addPost,
    updateReaction,
  };
}
