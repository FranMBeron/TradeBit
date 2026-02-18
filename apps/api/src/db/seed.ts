import { config } from "dotenv";
config({ path: "../../.env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

// Safety guard: prevent running seed against production
if (process.env.NODE_ENV === "production") {
  console.error("Cannot run seed in production environment.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding database...\n");

  // Clean existing data (in reverse FK order to respect foreign keys)
  await db.delete(schema.copyTrades);
  await db.delete(schema.reactions);
  await db.delete(schema.follows);
  await db.delete(schema.posts);
  await db.delete(schema.wallbitKeys);
  await db.delete(schema.users);

  // --- Users ---
  // Password is "password123" — pre-hashed with bcrypt (salt 12)
  // In production, auth.service.ts handles hashing dynamically
  const passwordHash =
    "$2b$12$LJ3p4TiGBfJhGz3fEP.YiuWzgVkJV5v1GZfRZJhIzqJR6rCwPmTXe";

  const [alice, bob, charlie] = await db
    .insert(schema.users)
    .values([
      {
        email: "alice@example.com",
        username: "alice_trader",
        displayName: "Alice",
        bio: "Full-time trader. NVDA maximalist.",
        passwordHash,
      },
      {
        email: "bob@example.com",
        username: "bob_markets",
        displayName: "Bob",
        bio: "Value investing enthusiast.",
        passwordHash,
      },
      {
        email: "charlie@example.com",
        username: "charlie_crypto",
        displayName: "Charlie",
        bio: "Crypto & stocks. DYOR.",
        passwordHash,
      },
    ])
    .returning();

  console.log("  Created 3 users");

  // --- Wallbit Keys (alice and bob have connected accounts) ---
  await db.insert(schema.wallbitKeys).values([
    {
      userId: alice!.id,
      encryptedKey: "fake-encrypted-key-alice",
      iv: "fake-iv-alice",
      authTag: "fake-tag-alice",
    },
    {
      userId: bob!.id,
      encryptedKey: "fake-encrypted-key-bob",
      iv: "fake-iv-bob",
      authTag: "fake-tag-bob",
    },
  ]);

  console.log("  Created 2 wallbit key connections");

  // --- Posts (mix of text-only and trade posts) ---
  const [post1, post2, post3, post4, post5] = await db
    .insert(schema.posts)
    .values([
      {
        authorId: alice!.id,
        content: "Just loaded up on more NVDA. AI is the future!",
        tradeTicker: "NVDA",
        tradeAction: "BUY" as const,
        tradeAmount: "3500.00",
        tradePrice: "875.50",
        tradeChangePct: "2.35",
      },
      {
        authorId: alice!.id,
        content: "Taking some profits on AAPL. Great run this quarter.",
        tradeTicker: "AAPL",
        tradeAction: "SELL" as const,
        tradeAmount: "2000.00",
        tradePrice: "198.75",
        tradeChangePct: "-0.45",
      },
      {
        authorId: bob!.id,
        content:
          "Markets looking strong today. Holding my positions steady. What are you all watching?",
      },
      {
        authorId: bob!.id,
        content: "Adding MSFT to my portfolio. Cloud business is undervalued.",
        tradeTicker: "MSFT",
        tradeAction: "BUY" as const,
        tradeAmount: "5000.00",
        tradePrice: "420.30",
        tradeChangePct: "1.12",
      },
      {
        authorId: charlie!.id,
        content: "New to the platform! Excited to share my trades here.",
      },
    ])
    .returning();

  console.log("  Created 5 posts");

  // --- Follows ---
  await db.insert(schema.follows).values([
    { followerId: alice!.id, followingId: bob!.id },
    { followerId: bob!.id, followingId: alice!.id },
    { followerId: charlie!.id, followingId: alice!.id },
  ]);

  console.log("  Created 3 follow relationships");

  // --- Reactions ---
  await db.insert(schema.reactions).values([
    { postId: post1!.id, userId: bob!.id, type: "rocket" as const },
    { postId: post1!.id, userId: charlie!.id, type: "chart" as const },
    { postId: post2!.id, userId: bob!.id, type: "diamond" as const },
    { postId: post4!.id, userId: alice!.id, type: "rocket" as const },
    { postId: post5!.id, userId: alice!.id, type: "speech" as const },
  ]);

  console.log("  Created 5 reactions");

  // --- Copy Trades ---
  await db.insert(schema.copyTrades).values([
    {
      sourcePostId: post1!.id,
      copierId: bob!.id,
      requestedAmount: "500",
      status: "executed" as const,
      executedAt: new Date(),
    },
  ]);

  console.log("  Created 1 copy trade");

  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});