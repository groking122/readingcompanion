import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Parse DATABASE_URL and ensure SSL is configured
const databaseUrl = process.env.DATABASE_URL;
const client = postgres(databaseUrl, {
  ssl: 'require',
  max: 1, // For scripts, use single connection
});
export const db = drizzle(client, { schema });

