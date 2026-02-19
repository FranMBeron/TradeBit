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
  // Accept token from Authorization header OR access_token cookie
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : request.cookies["access_token"];

  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { userId: payload.userId, email: payload.email };
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
