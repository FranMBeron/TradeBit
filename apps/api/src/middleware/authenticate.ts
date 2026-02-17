import { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../modules/auth/auth.service.js";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      userId: string;
      email: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = { userId: payload.userId, email: payload.email };
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
