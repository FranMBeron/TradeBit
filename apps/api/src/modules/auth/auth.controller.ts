import { FastifyInstance } from "fastify";
import { registerSchema, loginSchema } from "@tradebit/shared/validators";
import { authenticate } from "../../middleware/authenticate.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  sanitizeUser,
  createVerificationToken,
  verifyEmailToken,
} from "./auth.service.js";
import { sendVerificationEmail } from "../../lib/email.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const ACCESS_COOKIE = "access_token";
const ACCESS_MAX_AGE = 15 * 60; // 15 minutes in seconds

const COOKIE_OPTS = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: "strict" as const,
  path: "/",
});

export async function authRoutes(server: FastifyInstance) {
  const isSecure = process.env.NODE_ENV === "production";

  // ── POST /auth/register ───────────────────────────────────
  server.post(
    "/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Validation failed", issues: parsed.error.issues });
      }

      const { email, username, password } = parsed.data;

      const [existingEmail, existingUsername] = await Promise.all([
        findUserByEmail(email),
        findUserByUsername(username),
      ]);

      if (existingEmail) {
        return reply.status(409).send({ error: "Email already registered" });
      }
      if (existingUsername) {
        return reply.status(409).send({ error: "Username already taken" });
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser({ email, username, passwordHash });

      const token = await createVerificationToken(user.id);
      await sendVerificationEmail(user.email, token);

      return reply.status(201).send({ email: user.email });
    },
  );

  // ── POST /auth/login ──────────────────────────────────────
  server.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Validation failed", issues: parsed.error.issues });
      }

      const { email, password } = parsed.data;

      const user = await findUserByEmail(email);
      if (!user) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      if (!user.emailVerified) {
        return reply.status(403).send({ error: "Email not verified. Please check your inbox." });
      }

      const tokenPayload = { userId: user.id, email: user.email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        ...COOKIE_OPTS(isSecure),
        maxAge: REFRESH_MAX_AGE,
      });
      reply.setCookie(ACCESS_COOKIE, accessToken, {
        ...COOKIE_OPTS(isSecure),
        maxAge: ACCESS_MAX_AGE,
      });

      return { user: sanitizeUser(user), accessToken };
    },
  );

  // ── POST /auth/verify-email ───────────────────────────────
  server.post("/auth/verify-email", async (request, reply) => {
    const body = request.body as { token?: string };
    if (!body.token || typeof body.token !== "string") {
      return reply.status(400).send({ error: "Token is required" });
    }

    try {
      const { userId } = await verifyEmailToken(body.token);
      const user = await findUserById(userId);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const tokenPayload = { userId: user.id, email: user.email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        ...COOKIE_OPTS(isSecure),
        maxAge: REFRESH_MAX_AGE,
      });
      reply.setCookie(ACCESS_COOKIE, accessToken, {
        ...COOKIE_OPTS(isSecure),
        maxAge: ACCESS_MAX_AGE,
      });

      return reply.status(200).send({ user: sanitizeUser(user) });
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_OR_EXPIRED_TOKEN") {
        return reply.status(400).send({ error: "This link is invalid or has expired." });
      }
      throw err;
    }
  });

  // ── POST /auth/resend-verification ───────────────────────
  server.post(
    "/auth/resend-verification",
    { config: { rateLimit: { max: 3, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      const body = request.body as { email?: string };
      if (!body.email || typeof body.email !== "string") {
        return reply.status(400).send({ error: "Email is required" });
      }

      const user = await findUserByEmail(body.email);

      // Always return 200 to prevent user enumeration
      if (!user || user.emailVerified) {
        return reply.status(200).send({ sent: true });
      }

      const token = await createVerificationToken(user.id);
      await sendVerificationEmail(user.email, token);

      return reply.status(200).send({ sent: true });
    },
  );

  // ── POST /auth/refresh ────────────────────────────────────
  server.post("/auth/refresh", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) {
      return reply.status(401).send({ error: "No refresh token" });
    }

    try {
      const payload = verifyRefreshToken(token);
      const user = await findUserById(payload.userId);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const accessToken = signAccessToken({ userId: user.id, email: user.email });
      reply.setCookie(ACCESS_COOKIE, accessToken, {
        ...COOKIE_OPTS(isSecure),
        maxAge: ACCESS_MAX_AGE,
      });
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });

  // ── POST /auth/logout ─────────────────────────────────────
  server.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(ACCESS_COOKIE, COOKIE_OPTS(isSecure));
    reply.clearCookie(REFRESH_COOKIE, COOKIE_OPTS(isSecure));
    return { loggedOut: true };
  });

  // ── GET /auth/me ──────────────────────────────────────────
  server.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await findUserById(request.user.userId);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return { user: sanitizeUser(user) };
  });
}
