import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const tradeActionEnum = pgEnum("trade_action", ["BUY", "SELL"]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "rocket",
  "chart",
  "speech",
  "diamond",
]);

export const copyTradeStatusEnum = pgEnum("copy_trade_status", [
  "pending",
  "executed",
  "failed",
]);

// ============================================================
// Tables
// ============================================================

// --- Users ---
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: text("bio"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- Wallbit Keys ---
export const wallbitKeys = pgTable("wallbit_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  isValid: boolean("is_valid").default(true).notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
});

// --- Posts ---
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    tradeTicker: varchar("trade_ticker", { length: 10 }),
    tradeAction: tradeActionEnum("trade_action"),
    tradeAmount: decimal("trade_amount", { precision: 12, scale: 2 }),
    tradePrice: decimal("trade_price", { precision: 12, scale: 2 }),
    tradeChangePct: decimal("trade_change_pct", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_posts_author_created").on(table.authorId, table.createdAt.desc()),
    index("idx_posts_created").on(table.createdAt.desc()),
  ],
);

// --- Follows ---
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("idx_follows_follower").on(table.followerId),
    index("idx_follows_following").on(table.followingId),
    check("no_self_follow", sql`${table.followerId} != ${table.followingId}`),
  ],
);

// --- Reactions ---
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_reactions_unique").on(table.postId, table.userId, table.type),
    index("idx_reactions_post").on(table.postId),
  ],
);

// --- Copy Trades ---
export const copyTrades = pgTable(
  "copy_trades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePostId: uuid("source_post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    copierId: uuid("copier_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: copyTradeStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_copy_trades_copier").on(table.copierId)],
);

// --- Portfolio Snapshots ---
export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalValue: decimal("total_value", { precision: 14, scale: 2 }).notNull(),
    snapshotDate: timestamp("snapshot_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_snapshots_user_date").on(table.userId, table.snapshotDate),
    index("idx_snapshots_user").on(table.userId),
  ],
);

// ============================================================
// Relations (for Drizzle query API)
// ============================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  wallbitKey: one(wallbitKeys),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
  reactions: many(reactions),
  copyTrades: many(copyTrades),
  portfolioSnapshots: many(portfolioSnapshots),
}));

export const wallbitKeysRelations = relations(wallbitKeys, ({ one }) => ({
  user: one(users, {
    fields: [wallbitKeys.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  reactions: many(reactions),
  copyTrades: many(copyTrades),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const copyTradesRelations = relations(copyTrades, ({ one }) => ({
  sourcePost: one(posts, {
    fields: [copyTrades.sourcePostId],
    references: [posts.id],
  }),
  copier: one(users, {
    fields: [copyTrades.copierId],
    references: [users.id],
  }),
}));

export const portfolioSnapshotsRelations = relations(portfolioSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [portfolioSnapshots.userId],
    references: [users.id],
  }),
}));