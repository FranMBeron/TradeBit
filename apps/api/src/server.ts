import Fastify from "fastify";
import cors from "@fastify/cors";
import { APP_NAME } from "@tradebit/shared/constants";

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
});

server.get("/health", async () => {
  return { status: "ok", app: APP_NAME };
});

const port = Number(process.env.API_PORT) || 3001;

try {
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`${APP_NAME} API running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
