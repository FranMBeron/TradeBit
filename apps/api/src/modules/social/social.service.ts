import { eq, desc, lt, and, count, asc, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  users,
  follows,
  posts,
  reactions,
  wallbitKeys,
  portfolioSnapshots,
} from "../../db/schema.js";
import { decrypt } from "../wallbit/wallbit.vault.js";
import { takePortfolioSnapshot } from "../wallbit/wallbit.service.js";
import { sql } from "drizzle-orm";

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

// ── Follow / Unfollow ───────────────────────────────────────

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new ServiceError(400, "Cannot follow yourself");
  }

  const targetRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, followingId))
    .limit(1);

  if (targetRows.length === 0) {
    throw new ServiceError(404, "User not found");
  }

  try {
    await db.insert(follows).values({ followerId, followingId });
  } catch (error: any) {
    const msg = error.message || "";
    const isDuplicate =
      error.code === "23505" ||
      msg.includes("unique") ||
      msg.includes("duplicate key") ||
      msg.includes("violates unique constraint") ||
      (msg.includes("Failed query") && msg.includes("follows"));
    if (isDuplicate) {
      throw new ServiceError(409, "Already following this user");
    }
    throw error;
  }

  return { followed: true };
}

export async function unfollowUser(followerId: string, followingId: string) {
  const result = await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .returning();

  if (result.length === 0) {
    throw new ServiceError(404, "Not following this user");
  }

  return { unfollowed: true };
}

// ── User Profile ────────────────────────────────────────────

export async function getUserProfile(username: string, currentUserId: string) {
  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (userRows.length === 0) {
    throw new ServiceError(404, "User not found");
  }

  const user = userRows[0]!;

  const [followersResult, followingResult, postsResult, isFollowingResult] =
    await Promise.all([
      db.select({ count: count() }).from(follows).where(eq(follows.followingId, user.id)),
      db.select({ count: count() }).from(follows).where(eq(follows.followerId, user.id)),
      db.select({ count: count() }).from(posts).where(eq(posts.authorId, user.id)),
      db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, user.id)))
        .limit(1),
    ]);

  const performanceChange = await calculatePerformance(user.id);

  return {
    user: {
      ...user,
      stats: {
        followers: followersResult[0]!.count,
        following: followingResult[0]!.count,
        posts: postsResult[0]!.count,
      },
      isFollowing: isFollowingResult.length > 0,
      performanceChange,
    },
  };
}

// ── Performance Calculation ──────────────────────────────────
// Returns % change for day/week/month/year windows.
// Each period compares the oldest snapshot within the window vs the latest.
// null means not enough snapshots for that window yet.

async function calculatePerformance(userId: string): Promise<{
  day: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
} | null> {
  const keyRows = await db
    .select({ isValid: wallbitKeys.isValid })
    .from(wallbitKeys)
    .where(eq(wallbitKeys.userId, userId))
    .limit(1);

  if (keyRows.length === 0 || !keyRows[0]!.isValid) {
    return null;
  }

  // Get latest snapshot (current value)
  const latestRows = await db
    .select({ totalValue: portfolioSnapshots.totalValue, snapshotDate: portfolioSnapshots.snapshotDate })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, userId))
    .orderBy(desc(portfolioSnapshots.snapshotDate))
    .limit(1);

  if (latestRows.length === 0) return null;

  const currentValue = parseFloat(latestRows[0]!.totalValue);
  if (currentValue === 0) return null;

  const now = new Date();
  const windows = {
    day:   new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    week:  new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    year:  new Date(now.getFullYear(), 0, 1), // Jan 1 of current year
  };

  const calcPct = async (since: Date): Promise<number | null> => {
    const baselineRows = await db
      .select({ totalValue: portfolioSnapshots.totalValue })
      .from(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.userId, userId),
          sql`${portfolioSnapshots.snapshotDate} >= ${since}`,
        ),
      )
      .orderBy(asc(portfolioSnapshots.snapshotDate))
      .limit(1);

    if (baselineRows.length === 0) return null;

    const baselineValue = parseFloat(baselineRows[0]!.totalValue);
    if (baselineValue === 0) return null;

    // Need at least 2 distinct snapshots (baseline != current date)
    if (baselineRows[0] === latestRows[0]) return null;

    const pct = ((currentValue - baselineValue) / baselineValue) * 100;
    return Math.round(pct * 100) / 100;
  };

  const [day, week, month, year] = await Promise.all([
    calcPct(windows.day),
    calcPct(windows.week),
    calcPct(windows.month),
    calcPct(windows.year),
  ]);

  return { day, week, month, year };
}

// ── User Posts ──────────────────────────────────────────────

export async function getUserPosts(
  username: string,
  currentUserId: string,
  cursor?: string,
  limit = 20,
) {
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (userRows.length === 0) {
    throw new ServiceError(404, "User not found");
  }

  const targetUserId = userRows[0]!.id;
  const conditions: any[] = [eq(posts.authorId, targetUserId)];

  if (cursor) {
    conditions.push(lt(posts.createdAt, new Date(cursor)));
  }

  const postRows = await db
    .select({
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
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  const enrichedPosts = await enrichPostsWithReactions(postRows, currentUserId);

  const lastPost = enrichedPosts[enrichedPosts.length - 1];
  const nextCursor =
    enrichedPosts.length === limit ? lastPost?.createdAt?.toISOString() ?? null : null;

  return { posts: enrichedPosts, nextCursor };
}

// ── Cron: Take All Snapshots ────────────────────────────────

export async function takeAllSnapshots() {
  const keyRows = await db
    .select({
      userId: wallbitKeys.userId,
      encryptedKey: wallbitKeys.encryptedKey,
      iv: wallbitKeys.iv,
      authTag: wallbitKeys.authTag,
    })
    .from(wallbitKeys)
    .where(eq(wallbitKeys.isValid, true));

  let success = 0;
  let failed = 0;

  for (const row of keyRows) {
    try {
      const apiKey = decrypt({
        encryptedKey: row.encryptedKey,
        iv: row.iv,
        authTag: row.authTag,
      });
      await takePortfolioSnapshot(row.userId, apiKey);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed, total: keyRows.length };
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

  const reactionCounts = await db
    .select({
      postId: reactions.postId,
      type: reactions.type,
      count: count(),
    })
    .from(reactions)
    .where(inArray(reactions.postId, postIds))
    .groupBy(reactions.postId, reactions.type);

  const userReactionRows = await db
    .select({ postId: reactions.postId, type: reactions.type })
    .from(reactions)
    .where(and(inArray(reactions.postId, postIds), eq(reactions.userId, currentUserId)));

  const reactionMap = new Map<string, Record<string, number>>();
  for (const row of reactionCounts) {
    if (!reactionMap.has(row.postId)) reactionMap.set(row.postId, {});
    reactionMap.get(row.postId)![row.type] = row.count;
  }

  const userReactionMap = new Map<string, string[]>();
  for (const row of userReactionRows) {
    if (!userReactionMap.has(row.postId)) userReactionMap.set(row.postId, []);
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
