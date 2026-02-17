import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { APP_NAME } from "@tradebit/shared/constants";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { authRoutes } from "./modules/auth/auth.controller.js";

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
});

await server.register(cookie);
await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await server.register(authRoutes, { prefix: "/api/v1" });

server.get("/health", async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "ok", app: APP_NAME, db: "connected" };
  } catch {
    return { status: "ok", app: APP_NAME, db: "disconnected" };
  }
});

const port = Number(process.env.API_PORT) || 3001;

try {
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`${APP_NAME} API running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
