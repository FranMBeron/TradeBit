import { cookies } from "next/headers";

export interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;
    const json = Buffer.from(base64Payload, "base64url").toString("utf8");
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload): boolean {
  return payload.exp * 1000 < Date.now();
}

// Call from Server Components only (requires async context)
export async function getServerUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || isTokenExpired(payload)) return null;
  return payload;
}
