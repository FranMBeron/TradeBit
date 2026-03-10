import { config } from "dotenv";
config({ path: "../../.env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import { subDays, startOfDay } from "date-fns";

// Safety guard: prevent running seed against production accidentally
// Allow NODE_ENV=demo to bypass this for the demo deployment
if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
  console.error("Cannot run seed in production environment without DEMO_MODE=true.");
  process.exit(1);
}

// Para correr en producción (demo deployment):
// NODE_ENV=demo pnpm --filter api db:seed
// Requiere que DEMO_MODE=true esté en las env vars del servidor

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Pre-hashed "password123" with bcrypt salt 12
const passwordHash =
  "$2b$12$CQH3DUmQu4sVLnxF02lCc.4KZEEMtPX/.kDtfV.0sG6df2PJAQNG6";

// Helper: timestamp N days ago with some hour offset for variety
function daysAgo(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Clean existing data (reverse FK order) ──────────────────
  await db.delete(schema.emailVerificationTokens);
  await db.delete(schema.copyTrades);
  await db.delete(schema.reactions);
  await db.delete(schema.follows);
  await db.delete(schema.portfolioSnapshots);
  await db.delete(schema.posts);
  await db.delete(schema.wallbitKeys);
  await db.delete(schema.users);

  console.log("  Cleaned existing data");

  // ── Users ────────────────────────────────────────────────────
  const [alex, sarah, marcus, emma, jordan] = await db
    .insert(schema.users)
    .values([
      {
        email: "alex@tradebit.demo",
        username: "alextrader",
        displayName: "Alex Thompson",
        bio: "Full-time trader. NVDA maximalist 🚀 — been riding the AI wave since 2022. Portfolio up 47% YTD.",
        passwordHash,
        emailVerified: true,
        avatarUrl: null,
      },
      {
        email: "sarah@tradebit.demo",
        username: "sarahchen",
        displayName: "Sarah Chen",
        bio: "Value investor | 10+ year horizon | If Buffett would buy it, I'm interested. CFA candidate.",
        passwordHash,
        emailVerified: true,
        avatarUrl: null,
      },
      {
        email: "marcus@tradebit.demo",
        username: "marcusbtc",
        displayName: "Marcus Rivera",
        bio: "Crypto + equities. High risk, high reward. BTC maxi but I diversify when the charts say so.",
        passwordHash,
        emailVerified: true,
        avatarUrl: null,
      },
      {
        email: "emma@tradebit.demo",
        username: "emmatrades",
        displayName: "Emma Johansson",
        bio: "Day trader. Tight stops, disciplined exits. Risk management is everything. 6 years in the game.",
        passwordHash,
        emailVerified: true,
        avatarUrl: null,
      },
      {
        email: "jordan@tradebit.demo",
        username: "jordanpark",
        displayName: "Jordan Park",
        bio: "Growth stocks only. ARKK fan, but I pick my own. 5-10 year holds. AMZN, TSLA, NVDA core positions.",
        passwordHash,
        emailVerified: true,
        avatarUrl: null,
      },
    ])
    .returning();

  console.log("  Created 5 users");

  // ── Wallbit Keys (all demo users have "connected" accounts) ──
  const keyHashes = [
    "a".repeat(64),
    "b".repeat(64),
    "c".repeat(64),
    "d".repeat(64),
    "e".repeat(64),
  ];

  await db.insert(schema.wallbitKeys).values([
    {
      userId: alex!.id,
      encryptedKey: "demo-encrypted-key-alex",
      iv: "demo-iv-alex",
      authTag: "demo-tag-alex",
      keyHash: keyHashes[0]!,
    },
    {
      userId: sarah!.id,
      encryptedKey: "demo-encrypted-key-sarah",
      iv: "demo-iv-sarah",
      authTag: "demo-tag-sarah",
      keyHash: keyHashes[1]!,
    },
    {
      userId: marcus!.id,
      encryptedKey: "demo-encrypted-key-marcus",
      iv: "demo-iv-marcus",
      authTag: "demo-tag-marcus",
      keyHash: keyHashes[2]!,
    },
    {
      userId: emma!.id,
      encryptedKey: "demo-encrypted-key-emma",
      iv: "demo-iv-emma",
      authTag: "demo-tag-emma",
      keyHash: keyHashes[3]!,
    },
    {
      userId: jordan!.id,
      encryptedKey: "demo-encrypted-key-jordan",
      iv: "demo-iv-jordan",
      authTag: "demo-tag-jordan",
      keyHash: keyHashes[4]!,
    },
  ]);

  console.log("  Created 5 Wallbit key connections");

  // ── Posts ─────────────────────────────────────────────────────
  const insertedPosts = await db
    .insert(schema.posts)
    .values([
      // Alex — NVDA bull, tech focus
      {
        authorId: alex!.id,
        content:
          "Just added another $5k to NVDA. Jensen's keynote at CES confirmed everything I believed about the data center supercycle. This is still early innings. AI inference demand is about to 10x.",
        tradeTicker: "NVDA",
        tradeAction: "BUY" as const,
        tradeAmount: "5000.00",
        tradePrice: "875.50",
        tradeChangePct: "3.21",
        createdAt: daysAgo(0, 2),
      },
      {
        authorId: alex!.id,
        content:
          "Trimmed my TSLA position. Not bearish on the company long-term, but the valuation needs to come down to Earth. Taking profits after the 40% run since October. Will re-enter below $180.",
        tradeTicker: "TSLA",
        tradeAction: "SELL" as const,
        tradeAmount: "3200.00",
        tradePrice: "213.40",
        tradeChangePct: "-1.15",
        createdAt: daysAgo(1, 3),
      },
      {
        authorId: alex!.id,
        content:
          "Reminder that NVDA has beaten earnings estimates 8 quarters in a row. Next report is in 3 weeks. I'm not touching my position. The data center segment alone grew 409% YoY last quarter.",
        createdAt: daysAgo(2, 5),
      },

      // Sarah — value investor, blue chips
      {
        authorId: sarah!.id,
        content:
          "Initiated a position in BRK.B today. Berkshire is trading at a P/B of 1.4x — historically that's been a great entry point. Cash pile of $170B gives Buffett dry powder for the next downturn.",
        tradeTicker: "BRK.B",
        tradeAction: "BUY" as const,
        tradeAmount: "8000.00",
        tradePrice: "358.20",
        tradeChangePct: "0.82",
        createdAt: daysAgo(0, 4),
      },
      {
        authorId: sarah!.id,
        content:
          "Added to my MSFT position on the dip. Azure growth is re-accelerating — 29% constant currency last quarter. The Copilot monetization story is just beginning. This is a 10-year hold for me.",
        tradeTicker: "MSFT",
        tradeAction: "BUY" as const,
        tradeAmount: "6500.00",
        tradePrice: "412.80",
        tradeChangePct: "1.47",
        createdAt: daysAgo(1, 1),
      },
      {
        authorId: sarah!.id,
        content:
          "People obsess over quarter-to-quarter price movements. I track intrinsic value. The best investors are the most bored ones — they buy great companies and wait. The market will eventually agree with you.",
        createdAt: daysAgo(2, 8),
      },
      {
        authorId: sarah!.id,
        content:
          "Sold my remaining JNJ position. The talc litigation overhang is too uncertain for a value investment thesis. Rotating into ABBV — cleaner pipeline, better dividend growth trajectory.",
        tradeTicker: "JNJ",
        tradeAction: "SELL" as const,
        tradeAmount: "4200.00",
        tradePrice: "151.60",
        tradeChangePct: "-0.33",
        createdAt: daysAgo(3, 2),
      },

      // Marcus — crypto + stocks hybrid
      {
        authorId: marcus!.id,
        content:
          "BTC just broke through $95k resistance with massive volume. This is the institutional accumulation phase — BlackRock and Fidelity ETF inflows are relentless. Next stop $120k by end of Q2.",
        tradeTicker: "BTC",
        tradeAction: "BUY" as const,
        tradeAmount: "7500.00",
        tradePrice: "94850.00",
        tradeChangePct: "4.78",
        createdAt: daysAgo(0, 1),
      },
      {
        authorId: marcus!.id,
        content:
          "COIN correlation with BTC is tighter than ever. When crypto runs, Coinbase runs harder. Added to my position ahead of the ETH ETF options announcement. Risk/reward looks excellent here.",
        tradeTicker: "COIN",
        tradeAction: "BUY" as const,
        tradeAmount: "2800.00",
        tradePrice: "287.40",
        tradeChangePct: "6.32",
        createdAt: daysAgo(1, 6),
      },
      {
        authorId: marcus!.id,
        content:
          "Key levels I'm watching this week: BTC needs to hold $92k as support. Break below = possible flush to $85k. But the macro backdrop (Fed pause, dollar weakness) is still bullish. DCA is the move.",
        createdAt: daysAgo(2, 3),
      },

      // Emma — day trader, disciplined
      {
        authorId: emma!.id,
        content:
          "SPY momentum trade. Perfect 15-min setup — breakout above VWAP with volume surge at the open. In at 487.20, out at 489.80. Small gain but clean execution. Consistency beats home runs every time.",
        tradeTicker: "SPY",
        tradeAction: "BUY" as const,
        tradeAmount: "1500.00",
        tradePrice: "487.20",
        tradeChangePct: "0.53",
        createdAt: daysAgo(0, 6),
      },
      {
        authorId: emma!.id,
        content:
          "Cut my AAPL daytrade early. Was looking for a breakout above $199, it stalled at $198.50 three times. When a stock can't break a key level, it usually rejects hard. Stopped out for -0.3%. No regrets.",
        tradeTicker: "AAPL",
        tradeAction: "SELL" as const,
        tradeAmount: "2000.00",
        tradePrice: "198.20",
        tradeChangePct: "-0.28",
        createdAt: daysAgo(1, 4),
      },
      {
        authorId: emma!.id,
        content:
          "Rule I live by: never let a winning trade turn into a loser. Sounds obvious. Almost nobody does it. Your stop loss exists for a reason — once price hits it, you're out. No averaging down on momentum trades.",
        createdAt: daysAgo(1, 7),
      },
      {
        authorId: emma!.id,
        content:
          "Good week. 8 trades, 6 winners. Win rate doesn't matter as much as risk/reward — but consistency is a confidence multiplier. Took Friday off. Rest is part of the edge.",
        createdAt: daysAgo(3, 1),
      },

      // Jordan — growth stocks, long horizon
      {
        authorId: jordan!.id,
        content:
          "AMZN Q4 AWS guidance was stronger than expected. Cloud re-acceleration + AI workload growth = margin expansion story is intact. Added to my position. This is a 5-year hold minimum.",
        tradeTicker: "AMZN",
        tradeAction: "BUY" as const,
        tradeAmount: "4500.00",
        tradePrice: "212.60",
        tradeChangePct: "2.89",
        createdAt: daysAgo(0, 3),
      },
      {
        authorId: jordan!.id,
        content:
          "Started a small PLTR position. Controversial, I know. But the US government contract expansion and AIP platform adoption among enterprises is real. High risk, high upside. 2% portfolio allocation.",
        tradeTicker: "PLTR",
        tradeAction: "BUY" as const,
        tradeAmount: "1200.00",
        tradePrice: "67.80",
        tradeChangePct: "5.14",
        createdAt: daysAgo(1, 2),
      },
      {
        authorId: jordan!.id,
        content:
          "The market short-changes companies that are investing heavily in the future because it hurts near-term earnings. Amazon did it with AWS. Meta did it with infrastructure. NVDA is doing it with Blackwell. Patience.",
        createdAt: daysAgo(2, 6),
      },
      {
        authorId: jordan!.id,
        content:
          "Sold META position — up 85% from my entry 18 months ago. Rebalancing the gains into fresh AMZN and a small NVDA add. Letting winners run is good, but so is locking in gains and redeploying into new conviction.",
        tradeTicker: "META",
        tradeAction: "SELL" as const,
        tradeAmount: "9200.00",
        tradePrice: "584.30",
        tradeChangePct: "1.23",
        createdAt: daysAgo(3, 4),
      },
    ])
    .returning();

  console.log(`  Created ${insertedPosts.length} posts`);

  // ── Social graph ──────────────────────────────────────────────
  // Alex sigue a Sarah, Marcus, Jordan (su feed tendrá contenido variado)
  // Sarah y Emma se siguen mutuamente
  // Marcus sigue a Jordan
  await db.insert(schema.follows).values([
    { followerId: alex!.id, followingId: sarah!.id },
    { followerId: alex!.id, followingId: marcus!.id },
    { followerId: alex!.id, followingId: jordan!.id },
    { followerId: sarah!.id, followingId: alex!.id },
    { followerId: sarah!.id, followingId: emma!.id },
    { followerId: emma!.id, followingId: sarah!.id },
    { followerId: emma!.id, followingId: alex!.id },
    { followerId: marcus!.id, followingId: jordan!.id },
    { followerId: jordan!.id, followingId: alex!.id },
    { followerId: jordan!.id, followingId: marcus!.id },
  ]);

  console.log("  Created social graph (10 follow relationships)");

  // ── Reactions ─────────────────────────────────────────────────
  const p = insertedPosts;
  // Indexes: 0=alex-nvda-buy, 1=alex-tsla-sell, 2=alex-text, 3=sarah-brk-buy,
  // 4=sarah-msft-buy, 5=sarah-text, 6=sarah-jnj-sell, 7=marcus-btc-buy,
  // 8=marcus-coin-buy, 9=marcus-text, 10=emma-spy, 11=emma-aapl,
  // 12=emma-text1, 13=emma-text2, 14=jordan-amzn, 15=jordan-pltr,
  // 16=jordan-text, 17=jordan-meta-sell

  await db.insert(schema.reactions).values([
    // NVDA buy (post 0) — popular
    { postId: p[0]!.id, userId: sarah!.id, type: "chart" as const },
    { postId: p[0]!.id, userId: marcus!.id, type: "rocket" as const },
    { postId: p[0]!.id, userId: jordan!.id, type: "rocket" as const },
    { postId: p[0]!.id, userId: emma!.id, type: "chart" as const },
    // TSLA sell (post 1)
    { postId: p[1]!.id, userId: sarah!.id, type: "diamond" as const },
    { postId: p[1]!.id, userId: emma!.id, type: "chart" as const },
    // Alex text about NVDA (post 2)
    { postId: p[2]!.id, userId: jordan!.id, type: "rocket" as const },
    { postId: p[2]!.id, userId: marcus!.id, type: "chart" as const },
    // Sarah BRK buy (post 3)
    { postId: p[3]!.id, userId: alex!.id, type: "diamond" as const },
    { postId: p[3]!.id, userId: emma!.id, type: "diamond" as const },
    // Sarah MSFT buy (post 4)
    { postId: p[4]!.id, userId: alex!.id, type: "rocket" as const },
    { postId: p[4]!.id, userId: jordan!.id, type: "chart" as const },
    // Sarah value text (post 5)
    { postId: p[5]!.id, userId: alex!.id, type: "speech" as const },
    { postId: p[5]!.id, userId: emma!.id, type: "diamond" as const },
    { postId: p[5]!.id, userId: jordan!.id, type: "speech" as const },
    // Marcus BTC buy (post 7)
    { postId: p[7]!.id, userId: alex!.id, type: "rocket" as const },
    { postId: p[7]!.id, userId: jordan!.id, type: "rocket" as const },
    // Marcus COIN buy (post 8)
    { postId: p[8]!.id, userId: jordan!.id, type: "chart" as const },
    // Emma SPY trade (post 10)
    { postId: p[10]!.id, userId: sarah!.id, type: "chart" as const },
    { postId: p[10]!.id, userId: alex!.id, type: "rocket" as const },
    // Emma discipline text (post 12)
    { postId: p[12]!.id, userId: sarah!.id, type: "speech" as const },
    { postId: p[12]!.id, userId: alex!.id, type: "diamond" as const },
    { postId: p[12]!.id, userId: jordan!.id, type: "speech" as const },
    // Jordan AMZN buy (post 14)
    { postId: p[14]!.id, userId: alex!.id, type: "rocket" as const },
    { postId: p[14]!.id, userId: marcus!.id, type: "chart" as const },
    // Jordan META sell (post 17)
    { postId: p[17]!.id, userId: sarah!.id, type: "diamond" as const },
    { postId: p[17]!.id, userId: alex!.id, type: "chart" as const },
  ]);

  console.log("  Created reactions");

  // ── Portfolio Snapshots ───────────────────────────────────────
  const alexBaseValue = 18000;
  const sarahBaseValue = 45000;
  const marcusBaseValue = 22000;
  const jordanBaseValue = 31000;
  const emmaBaseValue = 12000;

  const snapshotRows: Array<{ userId: string; totalValue: string; snapshotDate: Date }> = [];

  // Build a walk for each user: start from baseValue 30 days ago, end ~20% higher today
  // dailyReturn has a slight positive bias (+0.007/day avg) with noise
  function buildWalk(startValue: number, days: number): number[] {
    const values: number[] = [startValue];
    for (let d = 1; d <= days; d++) {
      const dailyReturn = 1 + 0.007 + (Math.random() - 0.5) * 0.022;
      values.push(values[d - 1]! * dailyReturn);
    }
    return values;
  }

  const alexWalk   = buildWalk(alexBaseValue * 0.82,   30);
  const sarahWalk  = buildWalk(sarahBaseValue * 0.86,  30);
  const marcusWalk = buildWalk(marcusBaseValue * 0.80, 30);
  const jordanWalk = buildWalk(jordanBaseValue * 0.84, 30);
  const emmaWalk   = buildWalk(emmaBaseValue * 0.81,   30);

  for (let i = 30; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i));
    const idx = 30 - i; // 0 = oldest day, 30 = today
    snapshotRows.push(
      { userId: alex!.id,   totalValue: alexWalk[idx]!.toFixed(2),   snapshotDate: date },
      { userId: sarah!.id,  totalValue: sarahWalk[idx]!.toFixed(2),  snapshotDate: date },
      { userId: marcus!.id, totalValue: marcusWalk[idx]!.toFixed(2), snapshotDate: date },
      { userId: jordan!.id, totalValue: jordanWalk[idx]!.toFixed(2), snapshotDate: date },
      { userId: emma!.id,   totalValue: emmaWalk[idx]!.toFixed(2),   snapshotDate: date },
    );
  }

  await db.insert(schema.portfolioSnapshots).values(snapshotRows);

  console.log("  Created 30 days of portfolio snapshots for all users");

  console.log("\n✅ Seed complete!");
  console.log("   Demo user: alextrader / password123");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
