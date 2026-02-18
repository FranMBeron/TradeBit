import { eq, desc, lt, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { copyTrades, posts, users } from "../../db/schema.js";
import { getDecryptedKey } from "../wallbit/wallbit.service.js";
import { executeTrade, WallbitApiError } from "../wallbit/wallbit.client.js";

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

// ── Execute Copy Trade ───────────────────────────────────────

export async function executeCopyTrade(
  copierId: string,
  postId: string,
  amount: number,
) {
  // 1. Verify post exists and has a trade embed
  const postRows = await db
    .select({
      id: posts.id,
      tradeTicker: posts.tradeTicker,
      tradeAction: posts.tradeAction,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (postRows.length === 0) {
    throw new ServiceError(404, "Post not found");
  }

  const post = postRows[0]!;

  if (!post.tradeTicker || !post.tradeAction) {
    throw new ServiceError(400, "Post has no trade to copy");
  }

  // 2. Get copier's Wallbit key (throws ServiceError if not connected or invalid)
  const apiKey = await getDecryptedKey(copierId);

  // 3. Insert pending record
  const [record] = await db
    .insert(copyTrades)
    .values({
      sourcePostId: postId,
      copierId,
      requestedAmount: amount.toString(),
      status: "pending",
    })
    .returning();

  // 4. Execute trade via Wallbit
  try {
    await executeTrade(apiKey, {
      symbol: post.tradeTicker,
      direction: post.tradeAction as "BUY" | "SELL",
      currency: "USD",
      order_type: "MARKET",
      amount,
    });

    // 5a. Success — update to executed
    await db
      .update(copyTrades)
      .set({ status: "executed", executedAt: new Date() })
      .where(eq(copyTrades.id, record!.id));

    return { success: true, tradeId: record!.id };
  } catch (err) {
    // 5b. Failure — update to failed, re-throw as ServiceError
    const errorMessage =
      err instanceof WallbitApiError ? err.message : "Trade execution failed";

    await db
      .update(copyTrades)
      .set({ status: "failed", errorMessage })
      .where(eq(copyTrades.id, record!.id));

    throw new ServiceError(400, errorMessage);
  }
}

// ── Get Copy Trade History ───────────────────────────────────

export async function getCopyTradeHistory(
  copierId: string,
  cursor?: string,
  limit = 20,
) {
  const conditions: any[] = [eq(copyTrades.copierId, copierId)];

  if (cursor) {
    conditions.push(lt(copyTrades.createdAt, new Date(cursor)));
  }

  const rows = await db
    .select({
      id: copyTrades.id,
      status: copyTrades.status,
      requestedAmount: copyTrades.requestedAmount,
      errorMessage: copyTrades.errorMessage,
      executedAt: copyTrades.executedAt,
      createdAt: copyTrades.createdAt,
      postId: posts.id,
      postContent: posts.content,
      tradeTicker: posts.tradeTicker,
      tradeAction: posts.tradeAction,
      tradeAmount: posts.tradeAmount,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(copyTrades)
    .innerJoin(posts, eq(copyTrades.sourcePostId, posts.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(copyTrades.createdAt))
    .limit(limit);

  const trades = rows.map((row) => ({
    id: row.id,
    status: row.status,
    requestedAmount: row.requestedAmount,
    errorMessage: row.errorMessage,
    executedAt: row.executedAt,
    createdAt: row.createdAt,
    post: {
      id: row.postId,
      content: row.postContent,
      tradeTicker: row.tradeTicker,
      tradeAction: row.tradeAction,
      tradeAmount: row.tradeAmount,
      author: {
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      },
    },
  }));

  const lastTrade = trades[trades.length - 1];
  const nextCursor =
    trades.length === limit ? lastTrade?.createdAt?.toISOString() ?? null : null;

  return { trades, nextCursor };
}
