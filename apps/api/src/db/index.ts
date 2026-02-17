import { config } from "dotenv";
config({ path: "../../.env" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Create a .env file with your Neon connection string.",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });