import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import {
  connectWallbitKey,
  disconnectWallbitKey,
  getConnectionStatus,
  getUserPortfolio,
  ServiceError,
} from "./wallbit.service.js";

export async function wallbitRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook("preHandler", authenticate);

  // ── POST /wallbit/connect ───────────────────────────────
  server.post("/wallbit/connect", async (request, reply) => {
    const body = request.body as { apiKey?: string };
    if (!body.apiKey || typeof body.apiKey !== "string") {
      return reply.status(400).send({ error: "apiKey is required" });
    }

    try {
      const result = await connectWallbitKey(request.user.userId, body.apiKey);
      return result;
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // ── GET /wallbit/portfolio ──────────────────────────────
  server.get("/wallbit/portfolio", async (request, reply) => {
    try {
      const portfolio = await getUserPortfolio(request.user.userId);
      return { portfolio };
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // ── GET /wallbit/status ─────────────────────────────────
  server.get("/wallbit/status", async (request) => {
    return getConnectionStatus(request.user.userId);
  });

  // ── DELETE /wallbit/disconnect ──────────────────────────
  server.delete("/wallbit/disconnect", async (request, reply) => {
    try {
      const result = await disconnectWallbitKey(request.user.userId);
      return result;
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
