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
} from "./auth.service.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function authRoutes(server: FastifyInstance) {
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

      // Check uniqueness
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

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await createUser({ email, username, passwordHash });

      // Sign tokens
      const tokenPayload = { userId: user.id, email: user.email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: REFRESH_MAX_AGE,
      });

      return reply.status(201).send({ user: sanitizeUser(user), accessToken });
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

      const tokenPayload = { userId: user.id, email: user.email };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: REFRESH_MAX_AGE,
      });

      return { user: sanitizeUser(user), accessToken };
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
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
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
