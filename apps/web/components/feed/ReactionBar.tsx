"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Post, ReactionType } from "@/types/feed";

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: "rocket", emoji: "🚀" },
  { type: "chart", emoji: "📈" },
  { type: "speech", emoji: "💬" },
  { type: "diamond", emoji: "💎" },
];

interface ReactionBarProps {
  post: Post;
  onReact: (postId: string, type: ReactionType, action: "add" | "remove") => void;
}

export function ReactionBar({ post, onReact }: ReactionBarProps) {
  // Track pending reactions to prevent double-clicks
  const [pending, setPending] = useState<Set<ReactionType>>(new Set());

  async function handleClick(type: ReactionType) {
    if (pending.has(type)) return;

    const hasReacted = post.userReactions.includes(type);
    const action = hasReacted ? "remove" : "add";

    // Optimistic update
    onReact(post.id, type, action);
    setPending((s) => new Set(s).add(type));

    try {
      if (action === "add") {
        await apiFetch(`/posts/${post.id}/react`, { method: "POST", body: { type } });
      } else {
        await apiFetch(`/posts/${post.id}/react/${type}`, { method: "DELETE" });
      }
    } catch {
      // Revertir el optimistic update
      onReact(post.id, type, action === "add" ? "remove" : "add");
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(type);
        return next;
      });
    }
  }

  return (
    <div className="mt-3 flex items-center gap-1.5">
      {REACTIONS.map(({ type, emoji }) => {
        const active = post.userReactions.includes(type);
        const count = post.reactions[type];

        return (
          <button
            key={type}
            onClick={() => handleClick(type)}
            disabled={pending.has(type)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
              active
                ? "border-[#0d99ff]/40 bg-[#0d99ff]/12 text-[#0d99ff]"
                : "border-border text-muted-foreground hover:border-[#0d99ff]/30 hover:text-[#0d99ff]"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
