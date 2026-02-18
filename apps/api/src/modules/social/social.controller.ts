import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import {
  followUser,
  unfollowUser,
  getUserProfile,
  getUserPosts,
  takeAllSnapshots,
  ServiceError,
} from "./social.service.js";

export async function socialRoutes(server: FastifyInstance) {
  // ── Authenticated routes ────────────────────────────────────
  server.register(async (authedRoutes) => {
    authedRoutes.addHook("preHandler", authenticate);

    // POST /users/:id/follow
    authedRoutes.post("/users/:id/follow", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        return await followUser(request.user.userId, id);
      } catch (err) {
        if (err instanceof ServiceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    });

    // DELETE /users/:id/follow
    authedRoutes.delete("/users/:id/follow", async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        return await unfollowUser(request.user.userId, id);
      } catch (err) {
        if (err instanceof ServiceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    });

    // GET /users/:username
    authedRoutes.get("/users/:username", async (request, reply) => {
      const { username } = request.params as { username: string };
      try {
        return await getUserProfile(username, request.user.userId);
      } catch (err) {
        if (err instanceof ServiceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    });

    // GET /users/:username/posts
    authedRoutes.get("/users/:username/posts", async (request, reply) => {
      const { username } = request.params as { username: string };
      const query = request.query as { cursor?: string; limit?: string };
      const limit = query.limit ? Math.min(Number(query.limit), 50) : 20;
      try {
        return await getUserPosts(username, request.user.userId, query.cursor, limit);
      } catch (err) {
        if (err instanceof ServiceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    });
  });

  // ── Internal: cron snapshot endpoint (no auth, uses CRON_SECRET) ──
  server.post("/internal/snapshots", async (request, reply) => {
    const cronSecret = (request.headers as Record<string, string>)["x-cron-secret"];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const result = await takeAllSnapshots();
    return result;
  });
}
