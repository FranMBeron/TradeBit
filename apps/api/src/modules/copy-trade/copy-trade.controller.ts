import { FastifyInstance } from "fastify";
import { copyTradeSchema } from "@tradebit/shared/validators";
import { authenticate } from "../../middleware/authenticate.js";
import {
  executeCopyTrade,
  getCopyTradeHistory,
  ServiceError,
} from "./copy-trade.service.js";

export async function copyTradeRoutes(server: FastifyInstance) {
  server.addHook("preHandler", authenticate);

  // POST /copy-trade/:postId
  server.post("/copy-trade/:postId", async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const parsed = copyTradeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", issues: parsed.error.issues });
    }

    try {
      return await executeCopyTrade(request.user.userId, postId, parsed.data.amount);
    } catch (err) {
      if (err instanceof ServiceError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // GET /copy-trade/history
  server.get("/copy-trade/history", async (request) => {
    const query = request.query as { cursor?: string; limit?: string };
    const limit = query.limit ? Math.min(Number(query.limit), 50) : 20;
    return getCopyTradeHistory(request.user.userId, query.cursor, limit);
  });
}
