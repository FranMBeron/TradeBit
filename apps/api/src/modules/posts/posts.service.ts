import { eq, desc, lt, inArray, sql, and, count } from "drizzle-orm";
import { db } from "../../db/index.js";
import { posts, users, reactions, follows } from "../../db/schema.js";

// ── Error class ─────────────────────────────────────────────

export class ServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

// ── Types ───────────────────────────────────────────────────

interface CreatePostInput {
  content: string;
  tradeTicker?: string;
  tradeAction?: "BUY" | "SELL";
  tradeAmount?: number;
}

// ── Helper: enrich posts with reaction data ─────────────────

async function enrichPostsWithReactions(
  postRows: Array<{
    id: string;
    content: string;
    tradeTicker: string | null;
    tradeAction: string | null;
    tradeAmount: string | null;
    tradePrice: string | null;
    tradeChangePct: string | null;
    createdAt: Date;
    authorId: string;
    authorUsername: string;
    authorDisplayName: string | null;
    authorAvatarUrl: string | null;
  }>,
  currentUserId: string,
) {
  if (postRows.length === 0) return [];

  const postIds = postRows.map((r) => r.id);

  // Fetch all reaction counts for these posts in one query
  const reactionCounts = await db
    .select({
      postId: reactions.postId,
      type: reactions.type,
      count: count(),
    })
    .from(reactions)
    .where(inArray(reactions.postId, postIds))
    .groupBy(reactions.postId, reactions.type);

  // Fetch current user's reactions for these posts
  const userReactionRows = await db
    .select({
      postId: reactions.postId,
      type: reactions.type,
    })
    .from(reactions)
    .where(
      and(inArray(reactions.postId, postIds), eq(reactions.userId, currentUserId)),
    );

  // Build lookup maps
  const reactionMap = new Map<string, Record<string, number>>();
  for (const row of reactionCounts) {
    if (!reactionMap.has(row.postId)) {
      reactionMap.set(row.postId, {});
    }
    reactionMap.get(row.postId)![row.type] = row.count;
  }

  const userReactionMap = new Map<string, string[]>();
  for (const row of userReactionRows) {
    if (!userReactionMap.has(row.postId)) {
      userReactionMap.set(row.postId, []);
    }
    userReactionMap.get(row.postId)!.push(row.type);
  }

  return postRows.map((row) => {
    const counts = reactionMap.get(row.id) || {};
    return {
      id: row.id,
      content: row.content,
      tradeTicker: row.tradeTicker,
      tradeAction: row.tradeAction,
      tradeAmount: row.tradeAmount,
      tradePrice: row.tradePrice,
      tradeChangePct: row.tradeChangePct,
      createdAt: row.createdAt,
      authorId: row.authorId,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      },
      reactions: {
        rocket: counts["rocket"] || 0,
        chart: counts["chart"] || 0,
        speech: counts["speech"] || 0,
        diamond: counts["diamond"] || 0,
      },
      userReactions: userReactionMap.get(row.id) || [],
    };
  });
}

// Post select fields (reused in getPostById and getFeed)
const postSelectFields = {
  id: posts.id,
  content: posts.content,
  tradeTicker: posts.tradeTicker,
  tradeAction: posts.tradeAction,
  tradeAmount: posts.tradeAmount,
  tradePrice: posts.tradePrice,
  tradeChangePct: posts.tradeChangePct,
  createdAt: posts.createdAt,
  authorId: posts.authorId,
  authorUsername: users.username,
  authorDisplayName: users.displayName,
  authorAvatarUrl: users.avatarUrl,
};

// ── Create Post ─────────────────────────────────────────────

export async function createPost(
  authorId: string,
  input: CreatePostInput,
  tradePrice?: number,
) {
  const [created] = await db
    .insert(posts)
    .values({
      authorId,
      content: input.content,
      tradeTicker: input.tradeTicker ?? null,
      tradeAction: input.tradeAction ?? null,
      tradeAmount: input.tradeAmount?.toString() ?? null,
      tradePrice: tradePrice?.toString() ?? null,
      tradeChangePct: null,
    })
    .returning();

  return created!;
}

// ── Get Post By ID ──────────────────────────────────────────

export async function getPostById(postId: string, currentUserId: string) {
  const rows = await db
    .select(postSelectFields)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (rows.length === 0) {
    throw new ServiceError(404, "Post not found");
  }

  const enriched = await enrichPostsWithReactions(rows, currentUserId);
  return enriched[0];
}

// ── Delete Post ─────────────────────────────────────────────

export async function deletePost(postId: string, userId: string) {
  const rows = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

  if (rows.length === 0) {
    throw new ServiceError(404, "Post not found");
  }

  if (rows[0]!.authorId !== userId) {
    throw new ServiceError(403, "Not authorized to delete this post");
  }

  await db.delete(posts).where(eq(posts.id, postId));
  return { deleted: true };
}

// ── Get Feed ────────────────────────────────────────────────

export async function getFeed(userId: string, cursor?: string, limit = 20) {
  const followingSubquery = db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const conditions = [
    sql`(${posts.authorId} IN (${followingSubquery}) OR ${posts.authorId} = ${userId})`,
  ];

  if (cursor) {
    conditions.push(lt(posts.createdAt, new Date(cursor)));
  }

  const rows = await db
    .select(postSelectFields)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const enrichedPosts = await enrichPostsWithReactions(rows, userId);

  const lastPost = enrichedPosts[enrichedPosts.length - 1];
  const nextCursor = enrichedPosts.length === limit ? lastPost?.createdAt?.toISOString() ?? null : null;

  return { posts: enrichedPosts, nextCursor };
}

// ── Add Reaction ────────────────────────────────────────────

export async function addReaction(postId: string, userId: string, type: string) {
  const postRows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (postRows.length === 0) {
    throw new ServiceError(404, "Post not found");
  }

  try {
    await db.insert(reactions).values({
      postId,
      userId,
      type: type as "rocket" | "chart" | "speech" | "diamond",
    });
  } catch (error: any) {
    // Neon HTTP driver wraps PG unique violations differently —
    // check all known patterns
    const msg = error.message || "";
    const isUniqueViolation =
      error.code === "23505" ||
      error.constraint?.includes("unique") ||
      msg.includes("unique") ||
      msg.includes("duplicate key") ||
      msg.includes("violates unique constraint") ||
      (msg.includes("Failed query") && msg.includes("reactions"));
    if (isUniqueViolation) {
      throw new ServiceError(409, "Already reacted");
    }
    throw error;
  }

  return { added: true };
}

// ── Remove Reaction ─────────────────────────────────────────

export async function removeReaction(postId: string, userId: string, type: string) {
  const result = await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.postId, postId),
        eq(reactions.userId, userId),
        eq(reactions.type, type as "rocket" | "chart" | "speech" | "diamond"),
      ),
    )
    .returning();

  if (result.length === 0) {
    throw new ServiceError(404, "Reaction not found");
  }

  return { removed: true };
}
