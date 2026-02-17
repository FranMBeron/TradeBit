import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { wallbitKeys } from "../../db/schema.js";
import { encrypt, decrypt } from "./wallbit.vault.js";
import { validateKey, getStockPortfolio, WallbitApiError } from "./wallbit.client.js";

// ── Connect / Disconnect ────────────────────────────────────

export async function connectWallbitKey(userId: string, apiKey: string) {
  const isValid = await validateKey(apiKey);
  if (!isValid) {
    throw new ServiceError(400, "Invalid Wallbit API key");
  }

  const encrypted = encrypt(apiKey);

  // Upsert: if user already has a key, replace it
  await db
    .insert(wallbitKeys)
    .values({
      userId,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isValid: true,
    })
    .onConflictDoUpdate({
      target: wallbitKeys.userId,
      set: {
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        isValid: true,
        connectedAt: new Date(),
      },
    });

  return { connected: true };
}

export async function disconnectWallbitKey(userId: string) {
  const result = await db.delete(wallbitKeys).where(eq(wallbitKeys.userId, userId)).returning();
  if (result.length === 0) {
    throw new ServiceError(404, "No Wallbit account connected");
  }
  return { disconnected: true };
}

// ── Status / Portfolio ──────────────────────────────────────

export async function getConnectionStatus(userId: string) {
  const rows = await db.select().from(wallbitKeys).where(eq(wallbitKeys.userId, userId)).limit(1);
  const key = rows[0];
  return {
    connected: !!key,
    isValid: key?.isValid ?? false,
  };
}

export async function getUserPortfolio(userId: string) {
  const rows = await db.select().from(wallbitKeys).where(eq(wallbitKeys.userId, userId)).limit(1);
  const key = rows[0];

  if (!key) {
    throw new ServiceError(400, "No Wallbit account connected");
  }

  const apiKey = decrypt({
    encryptedKey: key.encryptedKey,
    iv: key.iv,
    authTag: key.authTag,
  });

  try {
    return await getStockPortfolio(apiKey);
  } catch (err) {
    if (err instanceof WallbitApiError && (err.status === 401 || err.status === 403)) {
      // Key is no longer valid — mark it
      await db
        .update(wallbitKeys)
        .set({ isValid: false })
        .where(eq(wallbitKeys.userId, userId));
      throw new ServiceError(400, "Wallbit API key is no longer valid. Please reconnect.");
    }
    throw err;
  }
}

// ── Helper: decrypt key for external use (copy-trade, etc.) ─

export async function getDecryptedKey(userId: string): Promise<string> {
  const rows = await db.select().from(wallbitKeys).where(eq(wallbitKeys.userId, userId)).limit(1);
  const key = rows[0];

  if (!key) {
    throw new ServiceError(400, "No Wallbit account connected");
  }
  if (!key.isValid) {
    throw new ServiceError(400, "Wallbit API key is no longer valid. Please reconnect.");
  }

  return decrypt({
    encryptedKey: key.encryptedKey,
    iv: key.iv,
    authTag: key.authTag,
  });
}

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
