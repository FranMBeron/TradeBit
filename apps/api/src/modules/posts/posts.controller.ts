import { FastifyInstance } from "fastify";
import { createPostSchema, reactionSchema } from "@tradebit/shared/validators";
import { REACTION_TYPES } from "@tradebit/shared/constants";
import { authenticate } from "../../middleware/authenticate.js";
import { getDecryptedKey } from "../wallbit/wallbit.service.js";
import { getAsset } from "../wallbit/wallbit.client.js";
import {
  createPost,
  getPostById,
  deletePost,
  getFeed,
  addReaction,
  removeReaction,
  ServiceError,
} from "./posts.service.js";

export async function postsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // ── GET /feed ─────────────────────────────────────────────
  server.get("/feed", async (request) => {
    const query = request.query as { cursor?: string; limit?: string };
    const limit = query.limit ? Math.min(Number(query.limit), 50) : 20;
    return getFeed(request.user.userId, query.cursor, limit);
  });

  // ── POST /posts ───────────────────────────────────────────
  server.post("/posts", async (request, reply) => {
    const parsed = createPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", issues: parsed.error.issues });
    }

    const { tradeTicker } = parsed.data;
    let tradePrice: number | undefined;

    // If trade embed, enrich with price from Wallbit API
    if (tradeTicker) {
      try {
        const apiKey = await getDecryptedKey(request.user.userId);
        const asset = await getAsset(apiKey, tradeTicker);
        tradePrice = asset.price;
      } catch (err) {
        if (err instanceof ServiceError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        // Wallbit API error — still create post but without price
        server.log.warn({ err }, "Failed to fetch asset price from Wallbit");
      }
    }

    const post = await createPost(request.user.userId, parsed.data, tradePrice);
    return reply.status(201).send({ post });
  });

  // ── GET /posts/:id ────────────────────────────────────────
  server.get("/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const post = await getPostById(id, request.user.userId);
      return { post };
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // ── DELETE /posts/:id ─────────────────────────────────────
  server.delete("/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deletePost(id, request.user.userId);
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // ── POST /posts/:id/react ────────────────────────────────
  server.post("/posts/:id/react", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = reactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", issues: parsed.error.issues });
    }

    try {
      return await addReaction(id, request.user.userId, parsed.data.type);
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // ── DELETE /posts/:id/react/:type ─────────────────────────
  server.delete("/posts/:id/react/:type", async (request, reply) => {
    const { id, type } = request.params as { id: string; type: string };
    if (!REACTION_TYPES.includes(type as any)) {
      return reply.status(400).send({ error: "Invalid reaction type" });
    }

    try {
      return await removeReaction(id, request.user.userId, type);
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
