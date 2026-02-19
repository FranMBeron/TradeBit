import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, emailVerificationTokens } from "../../db/schema.js";

const SALT_ROUNDS = 12;

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// ── Password helpers ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT helpers ─────────────────────────────────────────────

interface TokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

// ── DB queries ──────────────────────────────────────────────

export async function findUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function findUserByUsername(username: string) {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createUser(input: {
  email: string;
  username: string;
  passwordHash: string;
  emailVerified?: boolean;
}) {
  const result = await db
    .insert(users)
    .values({
      email: input.email,
      username: input.username,
      passwordHash: input.passwordHash,
      emailVerified: input.emailVerified ?? false,
    })
    .returning();
  return result[0]!;
}

// ── Email verification token helpers ────────────────────────

function hashVerificationToken(token: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(token).digest("hex");
}

export async function createVerificationToken(userId: string): Promise<string> {
  // Delete any existing token for this user (one active token at a time)
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function verifyEmailToken(token: string): Promise<{ userId: string }> {
  const tokenHash = hashVerificationToken(token);
  const now = new Date();

  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, now),
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  await db
    .update(users)
    .set({ emailVerified: true, emailVerifiedAt: now })
    .where(eq(users.id, record.userId));

  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, record.id));

  return { userId: record.userId };
}

// ── Helpers ─────────────────────────────────────────────────

/** Strip password_hash from user object before returning to client */
export function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
